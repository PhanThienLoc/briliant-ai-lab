export const TEACHING_PROGRESS_KEY = "briliantai.teaching-progress.v1";
export const REVIEW_DELAY_MS = 72 * 60 * 60 * 1000;
export type TeachingProgress = Record<string, { completedAt: string; reviewedAt?: string }>;
type ReadStorage = Pick<Storage, "getItem">;
export function parseTeachingProgress(raw: string): TeachingProgress {
  if (raw.length > 250_000) throw new Error("Tiến độ bài AI quá lớn.");
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length > 300) throw new Error("Tiến độ bài AI không hợp lệ.");
  for (const [key, entry] of Object.entries(value)) {
    if (!key.trim() || key.length > 300 || !entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error("Tiến độ bài AI không hợp lệ.");
    const record = entry as Record<string, unknown>;
    const done = typeof record.completedAt === "string" ? Date.parse(record.completedAt) : NaN;
    const review = typeof record.reviewedAt === "string" ? Date.parse(record.reviewedAt) : NaN;
    if (!Number.isFinite(done) || (record.reviewedAt !== undefined && (!Number.isFinite(review) || review < done + REVIEW_DELAY_MS))) throw new Error("Mốc ôn bài AI không hợp lệ.");
    if (Object.keys(record).some((field) => !["completedAt", "reviewedAt"].includes(field))) throw new Error("Trường tiến độ không hợp lệ.");
  }
  return value as TeachingProgress;
}
export function readTeachingProgress(getStorage: () => ReadStorage): { progress: TeachingProgress | null; error: string | null } {
  try { return { progress: parseTeachingProgress(getStorage().getItem(TEACHING_PROGRESS_KEY) ?? "{}"), error: null }; }
  catch { return { progress: null, error: "Không đọc được tiến độ bài AI. Dữ liệu trước đó chưa bị thay đổi." }; }
}
export function teachingReviewDue(progress: TeachingProgress, key: string, now = Date.now()): boolean {
  const entry = progress[key];
  return Boolean(entry && !entry.reviewedAt && Number.isFinite(Date.parse(entry.completedAt)) && now >= Date.parse(entry.completedAt) + REVIEW_DELAY_MS);
}
export function recordTeachingCheck(storage: ReadStorage & Pick<Storage, "setItem">, key: string, review: boolean, now = new Date()): TeachingProgress {
  const current = parseTeachingProgress(storage.getItem(TEACHING_PROGRESS_KEY) ?? "{}");
  if (!key.trim() || key.length > 300 || !Number.isFinite(now.getTime())) throw new Error("Bằng chứng bài AI không hợp lệ.");
  const next: TeachingProgress = { ...current };
  if (review) {
    if (!teachingReviewDue(current, key, now.getTime())) throw new Error("Bài ôn chỉ mở sau 72 giờ từ lần kiểm tra đạt đầu tiên.");
    next[key] = { ...current[key], reviewedAt: now.toISOString() };
  } else if (!Object.prototype.hasOwnProperty.call(current, key)) next[key] = { completedAt: now.toISOString() };
  parseTeachingProgress(JSON.stringify(next));
  try { storage.setItem(TEACHING_PROGRESS_KEY, JSON.stringify(next)); }
  catch { throw new Error("Không lưu được tiến độ bài AI. Hãy kiểm tra dung lượng bộ nhớ."); }
  return next;
}
