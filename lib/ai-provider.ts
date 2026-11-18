export type AiConfig = {
  provider: "openrouter" | "gemini";
  apiKey: string;
  model: string;
  geminiFreeTier: boolean;
};

export const OPENROUTER_FREE_MODEL = "openrouter/free";
export const GEMINI_FREE_TIER_MODEL = "gemini-2.5-flash-lite";
const REQUEST_TIMEOUT_MS = 45_000;
const MAX_PROVIDER_RESPONSE_CHARS = 100_000;
export const MAX_AI_PROMPT_CHARS = 22_000;
export const MAX_AI_REQUEST_CHARS = 35_000;

class AiProviderError extends Error {}

const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const invalid = () => new AiProviderError("Cấu hình AI không hợp lệ. Chỉ dùng nhà cung cấp và model miễn phí được hỗ trợ.");

/** This checks the user's declaration, not the billing status of a Google project. */
export function validateAiConfig(value: unknown): AiConfig {
  if (!record(value) || !["openrouter", "gemini"].includes(value.provider as string)
    || typeof value.apiKey !== "string" || !value.apiKey.trim() || value.apiKey.length > 512
    || /[\r\n]/.test(value.apiKey) || typeof value.geminiFreeTier !== "boolean"
    || Object.keys(value).some((key) => !["provider", "apiKey", "model", "geminiFreeTier"].includes(key))) throw invalid();
  if (value.provider === "openrouter" && value.model !== OPENROUTER_FREE_MODEL) throw invalid();
  if (value.provider === "gemini" && (value.model !== GEMINI_FREE_TIER_MODEL || !value.geminiFreeTier)) {
    throw new AiProviderError("Gemini cần dự án Free Tier chưa bật billing. Ứng dụng không thể tự xác minh trạng thái billing; hãy dùng OpenRouter nếu chưa chắc.");
  }
  return { provider: value.provider as AiConfig["provider"], apiKey: value.apiKey.trim(), model: value.model as string, geminiFreeTier: value.geminiFreeTier };
}

export function validateTeachingPrompt(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.length > MAX_AI_PROMPT_CHARS) throw new AiProviderError("Nội dung gửi AI không hợp lệ hoặc quá dài. Hãy chọn ít đoạn nguồn hơn.");
  return value;
}

export async function readBoundedText(response: Response, maxChars: number): Promise<string> {
  if (!response.body) throw new AiProviderError("Không đọc được phản hồi AI.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let result = "";
  let bytes = 0;
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      bytes += item.value.byteLength;
      if (bytes > maxChars * 4) throw new AiProviderError("Phản hồi AI vượt giới hạn dung lượng.");
      result += decoder.decode(item.value, { stream: true });
      if (result.length > maxChars) throw new AiProviderError("Phản hồi AI vượt giới hạn dung lượng.");
    }
    result += decoder.decode();
    if (result.length > maxChars) throw new AiProviderError("Phản hồi AI vượt giới hạn dung lượng.");
    return result;
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

function upstreamError(status: number): Error {
  if (status === 401 || status === 403) return new AiProviderError("API key chưa hợp lệ hoặc không có quyền dùng model. Kiểm tra trong Cài đặt.");
  if (status === 429) return new AiProviderError("Đã chạm hạn mức miễn phí. Hãy chờ rồi chủ động thử lại; ứng dụng không đổi sang model trả phí.");
  if (status === 402) return new AiProviderError("Nhà cung cấp yêu cầu thanh toán. Yêu cầu đã dừng; ứng dụng không nạp tiền hoặc chuyển model.");
  return new AiProviderError("Nhà cung cấp AI chưa xử lý được yêu cầu. Bản nháp nguồn vẫn được giữ nguyên.");
}

/** Server-side only usage: transient key is never put in a URL, log, storage or response. */
export async function requestTeachingText(configInput: AiConfig, promptInput: string, fetcher: typeof fetch = fetch): Promise<string> {
  const config = validateAiConfig(configInput);
  const prompt = validateTeachingPrompt(promptInput);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const openrouter = config.provider === "openrouter";
    const endpoint = openrouter ? "https://openrouter.ai/api/v1/chat/completions"
      : "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";
    const response = await fetcher(endpoint, {
      method: "POST", redirect: "error", signal: controller.signal,
      headers: openrouter
        ? { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` }
        : { "Content-Type": "application/json", "x-goog-api-key": config.apiKey },
      body: JSON.stringify(openrouter ? {
        model: OPENROUTER_FREE_MODEL, messages: [{ role: "user", content: prompt }],
        provider: { max_price: { prompt: 0, completion: 0, request: 0 }, allow_fallbacks: false },
        max_tokens: 6000, stream: false,
      } : {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 6000, responseMimeType: "application/json" },
      }),
    });
    if (!response.ok) throw upstreamError(response.status);
    let data: unknown;
    try { data = JSON.parse(await readBoundedText(response, MAX_PROVIDER_RESPONSE_CHARS)); }
    catch { throw new AiProviderError("Phản hồi AI không đọc được hoặc quá lớn. Chưa tạo khóa học."); }
    if (!record(data) || data.error) throw new AiProviderError("Nhà cung cấp trả lỗi. Chưa tạo khóa học.");
    if (openrouter) {
      const choices = data.choices;
      if (!Array.isArray(choices) || choices.length !== 1 || !record(choices[0]) || choices[0].finish_reason !== "stop"
        || !record(choices[0].message) || choices[0].message.refusal || typeof choices[0].message.content !== "string"
        || !choices[0].message.content.trim()) throw new AiProviderError("AI từ chối hoặc chưa trả đủ nội dung. Chưa tạo khóa học; hãy chọn nguồn ngắn hơn.");
      return choices[0].message.content;
    }
    const candidates = data.candidates;
    if (data.promptFeedback && record(data.promptFeedback) && data.promptFeedback.blockReason) throw new AiProviderError("AI từ chối nguồn này. Chưa tạo khóa học.");
    if (!Array.isArray(candidates) || candidates.length !== 1 || !record(candidates[0]) || candidates[0].finishReason !== "STOP"
      || !record(candidates[0].content) || !Array.isArray(candidates[0].content.parts)) throw new AiProviderError("AI từ chối hoặc chưa trả đủ nội dung. Chưa tạo khóa học; hãy chọn nguồn ngắn hơn.");
    const parts = candidates[0].content.parts;
    if (!parts.length || parts.some((part) => !record(part) || typeof part.text !== "string")) throw new AiProviderError("Phản hồi AI chưa đúng định dạng văn bản.");
    const output = parts.map((part) => (part as { text: string }).text).join("");
    if (!output.trim()) throw new AiProviderError("AI chưa trả nội dung. Chưa tạo khóa học.");
    return output;
  } catch (error) {
    if (controller.signal.aborted) throw new AiProviderError("AI phản hồi quá 45 giây. Yêu cầu đã dừng; không tự gửi lại.");
    // Network/transport exception text can contain URLs or credentials; do not reflect it.
    if (error instanceof TypeError) throw new AiProviderError("Không kết nối được nhà cung cấp AI. Kiểm tra mạng hoặc thử lại sau.");
    if (error instanceof AiProviderError) throw error;
    throw new AiProviderError("Không xử lý được phản hồi AI. Bản nháp nguồn vẫn được giữ nguyên.");
  } finally { clearTimeout(timer); }
}

/** Caller must display the exact prompt/source and obtain explicit send consent first. */
export async function generateTeachingText(config: AiConfig, prompt: string, signal?: AbortSignal): Promise<string> {
  validateAiConfig(config); validateTeachingPrompt(prompt);
  try {
    const response = await fetch("/api/ai-course", { method: "POST", credentials: "same-origin", signal,
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ config, prompt }) });
    const payload: unknown = JSON.parse(await readBoundedText(response, MAX_PROVIDER_RESPONSE_CHARS));
    if (!response.ok || !record(payload) || typeof payload.text !== "string") {
      if (record(payload) && typeof payload.error === "string" && payload.error.length <= 400) throw new AiProviderError(payload.error);
      throw new AiProviderError("Không tạo được bài học AI. Nguồn cũ chưa thay đổi.");
    }
    return payload.text;
  } catch (error) {
    if (signal?.aborted) throw new AiProviderError("Đã dừng chờ phản hồi. Không tự gửi lại yêu cầu.");
    if (error instanceof TypeError) throw new AiProviderError("Không kết nối được dịch vụ AI của ứng dụng.");
    throw error;
  }
}
