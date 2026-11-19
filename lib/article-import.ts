export const ARTICLE_HOSTS = [
  "medium.com", "www.medium.com", "towardsdatascience.com", "www.towardsdatascience.com",
  "distill.pub", "arxiv.org", "en.wikipedia.org", "vi.wikipedia.org",
  "developers.google.com", "ai.google.dev", "aistudio.google.com", "developer.android.com",
  "docs.python.org", "scikit-learn.org", "pytorch.org", "www.tensorflow.org",
  "huggingface.co", "developer.chrome.com", "developers.cloudflare.com",
] as const;
const HOSTS = new Set<string>(ARTICLE_HOSTS);
export class ArticleImportError extends Error {}
const fail = (message: string): never => { throw new ArticleImportError(message); };
export function validateArticleUrl(input: unknown): URL {
  if (typeof input !== "string" || input.length > 2048 || /[\u0000-\u0020\u007f]/.test(input)) return fail("Liên kết bài viết không hợp lệ.");
  let url: URL;
  try { url = new URL(input); } catch { return fail("Liên kết bài viết không hợp lệ."); }
  if (url.protocol !== "https:" || url.username || url.password || url.port || !HOSTS.has(url.hostname)) return fail("Chỉ đọc trực tiếp HTTPS từ trang được hỗ trợ. Với trang khác, hãy dán nội dung hoặc tải PDF.");
  url.hash = "";
  return url;
}
type ArticleText = { title: string; text: string };
type ImportedArticle = ArticleText & { url: string; truncated: boolean };
const clean = (text: string) => text.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/[ \t]*\n[ \t]*/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

export async function extractArticleHtml(html: string): Promise<ArticleText> {
  let skip = 0, articleDepth = 0, mainDepth = 0, bodyDepth = 0, titleDepth = 0;
  let article = "", main = "", body = "", title = "";
  function append(value: string) {
    if (skip) return;
    if (titleDepth) title += value;
    if (articleDepth) article += value;
    if (mainDepth) main += value;
    if (bodyDepth) body += value;
  }
  const parser = new HTMLRewriter()
    .on("script, style, noscript, template, nav, footer, aside, form, button, svg", { element(e) { skip++; e.onEndTag(() => { skip--; }); } })
    .on("article", { element(e) { articleDepth++; e.onEndTag(() => { articleDepth--; }); } })
    .on("main", { element(e) { mainDepth++; e.onEndTag(() => { mainDepth--; }); } })
    .on("body", { element(e) { bodyDepth++; e.onEndTag(() => { bodyDepth--; }); } })
    .on("title", { element(e) { titleDepth++; e.onEndTag(() => { titleDepth--; }); } })
    .on("p, h1, h2, h3, h4, h5, h6, li, pre, blockquote, br", { element(e) { append("\n\n"); if (e.tagName !== "br") e.onEndTag(() => append("\n\n")); } })
    .onDocument({ text(chunk) { append(chunk.text); } });
  await parser.transform(new Response(html, {headers:{"Content-Type":"text/html;charset=utf-8"}})).body!.pipeTo(new WritableStream({ write() {} }));
  return {title:clean(title).slice(0,160),text:[article,main,body].map(clean).find(s=>s.length>=400)??""};
}
async function boundedBody(response: Response): Promise<string> {
  if (Number(response.headers.get("content-length")??0)>1_048_576) return fail("Trang quá lớn. Hãy dán một phần nội dung hoặc tải PDF.");
  if (!response.body) return fail("Trang không có nội dung.");
  const reader=response.body.getReader(), decoder=new TextDecoder(); let bytes=0, text="";
  try {
    while (true) {const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;if(bytes>1_048_576)return fail("Trang quá lớn. Hãy dán một phần nội dung hoặc tải PDF.");text+=decoder.decode(part.value,{stream:true});}
    return text+decoder.decode();
  } finally {await reader.cancel().catch(()=>{});reader.releaseLock();}
}
export async function importArticle(input: unknown, fetcher: typeof fetch = fetch, extractor=extractArticleHtml): Promise<ImportedArticle> {
  let url=validateArticleUrl(input);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try {
    for(let redirects=0;redirects<=3;redirects++){
      const response=await fetcher(url.href,{method:"GET",redirect:"manual",credentials:"omit",signal:controller.signal,headers:{Accept:"text/html,text/plain;q=0.8"}});
      if([301,302,303,307,308].includes(response.status)){
        const location=response.headers.get("location");await response.body?.cancel();
        if(!location||redirects===3)return fail("Trang chuyển hướng quá nhiều.");
        url=validateArticleUrl(new URL(location,url).href);continue;
      }
      if([401,403,429].includes(response.status))return fail("Trang yêu cầu đăng nhập hoặc chặn truy cập. Hãy dán nội dung hoặc tải PDF.");
      if(!response.ok)return fail("Không đọc được trang bài viết.");
      const type=response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
      if(type==="application/pdf")return fail("Đây là link PDF. Hãy tải tệp PDF rồi chọn tệp trong ứng dụng.");
      if(type!=="text/html"&&type!=="text/plain"&&type!=="application/xhtml+xml")return fail("Liên kết không trả về văn bản được hỗ trợ.");
      const raw=await boundedBody(response), parsed=type==="text/plain"?{title:url.hostname,text:raw}:await extractor(raw);
      const text=clean(parsed.text);
      if(/verify.*human|checking your browser|captcha|access denied/i.test(parsed.title))return fail("Trang yêu cầu xác minh. Ứng dụng không vượt bước xác minh; hãy dán nội dung.");
      if(text.length<400)return fail("Không đủ nội dung bài viết. Trang có thể cần JavaScript hoặc đăng nhập; hãy dán nội dung hoặc tải PDF.");
      return {url:url.href,title:clean(parsed.title).slice(0,160)||url.hostname,text:text.slice(0,120000),truncated:text.length>120000};
    }
    return fail("Không đọc được chuyển hướng.");
  } catch(error) {
    if(error instanceof ArticleImportError)throw error;
    return fail(controller.signal.aborted?"Đọc link quá thời gian. Hãy dán nội dung hoặc tải PDF.":"Môi trường không kết nối hoặc không đọc được trang. Hãy dán nội dung hoặc tải PDF.");
  } finally {clearTimeout(timer);}
}
