import { importArticle, ArticleImportError } from "../../../lib/article-import.ts";
import { readBoundedText } from "../../../lib/ai-provider.ts";
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
export async function POST(request:Request):Promise<Response>{
  if(request.headers.get("origin")!==new URL(request.url).origin)return json({error:"Chỉ nhận yêu cầu từ ứng dụng."},403);
  if(request.headers.get("content-type")?.split(";")[0].trim().toLowerCase()!=="application/json")return json({error:"Yêu cầu cần JSON."},415);
  let value:unknown;
  try{value=JSON.parse(await readBoundedText(new Response(request.body),4096));}
  catch{return json({error:"Liên kết không hợp lệ hoặc quá lớn."},400);}
  if(!value||typeof value!=="object"||Array.isArray(value)||Object.keys(value).length!==1||!("url" in value))return json({error:"Chỉ gửi liên kết bài viết."},400);
  try{return json(await importArticle(value.url));}
  catch(error){return json({error:error instanceof ArticleImportError?error.message:"Không đọc được bài viết."},400);}
}
