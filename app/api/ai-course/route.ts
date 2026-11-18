import { MAX_AI_REQUEST_CHARS, readBoundedText, requestTeachingText, validateAiConfig, validateTeachingPrompt } from "../../../lib/ai-provider.ts";

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });

export async function POST(request: Request): Promise<Response> {
  if (request.headers.get("origin") !== new URL(request.url).origin) return json({ error: "Chỉ nhận yêu cầu từ chính ứng dụng." }, 403);
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return json({ error: "Yêu cầu cần JSON." }, 415);
  const declared = request.headers.get("content-length");
  if (declared && Number(declared) > MAX_AI_REQUEST_CHARS * 4) return json({ error: "Yêu cầu quá lớn." }, 413);
  let value: unknown;
  try { value = JSON.parse(await readBoundedText(new Response(request.body), MAX_AI_REQUEST_CHARS)); }
  catch { return json({ error: "Yêu cầu không hợp lệ hoặc quá lớn." }, 400); }
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some((key) => !["config", "prompt"].includes(key))) return json({ error: "Yêu cầu không hợp lệ." }, 400);
  const input = value as Record<string, unknown>;
  let config, prompt;
  try { config = validateAiConfig(input.config); prompt = validateTeachingPrompt(input.prompt); }
  catch { return json({ error: "Kiểm tra API key, model miễn phí và nội dung trong Cài đặt trước khi gửi." }, 400); }
  try { return json({ text: await requestTeachingText(config, prompt) }); }
  catch (error) { return json({ error: error instanceof Error ? error.message : "Không tạo được nội dung AI." }, 502); }
}
