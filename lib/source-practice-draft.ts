import { parseSourceCourses, type SourceCourse } from "./source-course.ts";

export const SOURCE_PRACTICE_DRAFT_KEY = "briliantai.source-practice-draft.v1";
export const MAX_PRACTICE_DRAFT_CHARS = 2_000_000;

export type SourcePracticeDraft = {
  version: 1;
  course: SourceCourse;
  selectedIds: string[];
  edits: Record<string, { title: string; objective: string }>;
  updatedAt: string;
};

const fail = (): never => { throw new Error("Bản nháp không hợp lệ. Dữ liệu đã lưu chưa bị thay đổi."); };
const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);

export function parseSourcePracticeDraft(raw: string): SourcePracticeDraft {
  if (raw.length > MAX_PRACTICE_DRAFT_CHARS) throw new Error("Bản nháp quá lớn. Hãy chọn nguồn ngắn hơn.");
  const value: unknown = JSON.parse(raw);
  if (!record(value) || value.version !== 1 || !record(value.course)) return fail();
  const course = parseSourceCourses(JSON.stringify([value.course]))[0];
  if (course.lessons.some((lesson) => lesson.completedAt !== undefined || lesson.reviewDueAt !== undefined || lesson.reviewedAt !== undefined)) return fail();
  const ids = new Set(course.lessons.map((lesson) => lesson.id));
  if (!Array.isArray(value.selectedIds) || value.selectedIds.some((id) => typeof id !== "string" || !ids.has(id)) || new Set(value.selectedIds).size !== value.selectedIds.length) return fail();
  if (!record(value.edits)) return fail();
  for (const [id, edit] of Object.entries(value.edits)) {
    // Blank edits are valid work in progress; publication performs the final nonempty check.
    if (!ids.has(id) || !record(edit) || typeof edit.title !== "string" || edit.title.length > 100 || typeof edit.objective !== "string" || edit.objective.length > 300) return fail();
  }
  if (typeof value.updatedAt !== "string" || !value.updatedAt.trim() || !Number.isFinite(Date.parse(value.updatedAt))) return fail();
  return value as SourcePracticeDraft;
}

export function readSourcePracticeDraft(getStorage: () => Pick<Storage, "getItem">): { draft: SourcePracticeDraft | null; error: string | null } {
  try {
    const raw = getStorage().getItem(SOURCE_PRACTICE_DRAFT_KEY);
    return { draft: raw === null ? null : parseSourcePracticeDraft(raw), error: null };
  } catch {
    return { draft: null, error: "Không đọc được bản nháp đã lưu. Dữ liệu cũ được giữ nguyên; hãy kiểm tra quyền lưu trữ hoặc sao lưu trước khi xóa bản nháp." };
  }
}

export function saveSourcePracticeDraft(storage: Pick<Storage, "getItem" | "setItem">, draft: SourcePracticeDraft): void {
  const serialized = JSON.stringify(draft);
  parseSourcePracticeDraft(serialized);
  const existing = storage.getItem(SOURCE_PRACTICE_DRAFT_KEY);
  if (existing !== null) parseSourcePracticeDraft(existing);
  try {
    storage.setItem(SOURCE_PRACTICE_DRAFT_KEY, serialized);
  } catch {
    throw new Error("Không lưu được bản nháp: bộ nhớ đầy hoặc bị chặn. Bản đang sửa vẫn còn trên màn hình; bản đã lưu trước đó chưa thay đổi.");
  }
}

export function clearSourcePracticeDraft(storage: Pick<Storage, "removeItem">): void {
  try {
    storage.removeItem(SOURCE_PRACTICE_DRAFT_KEY);
  } catch {
    throw new Error("Không xóa được bản nháp đã lưu. Hãy kiểm tra quyền lưu trữ.");
  }
}
