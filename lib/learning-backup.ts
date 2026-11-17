import { ADAPTIVE_STATE_KEY, isLessonProgressShape, normalizeAdaptiveState, type AdaptiveState } from "./learning-repository.ts";
import { lessonCatalog } from "./lesson-catalog.ts";
import { parseSourceCourses, SOURCE_COURSES_KEY } from "./source-course.ts";

export const LEARNING_BACKUP_SCHEMA = 1;
export const MAX_BACKUP_BYTES = 512_000;

export type LearningBackup = {
  product: "BriliantAI Lab";
  schemaVersion: 1;
  exportedAt: string;
  data: Record<string, string>;
};

export type LearningBackupSummary = {
  itemCount: number;
  lessonCount: number;
  expansionLabCount: number;
  hasDiagnostic: boolean;
  hasAdaptiveState: boolean;
  hasLearningLog: boolean;
  hasRepairQueue: boolean;
};

type StorageLike = Pick<Storage, "length" | "key" | "getItem" | "setItem" | "removeItem">;

const LESSON_KEY = /^briliantai\.lesson\.[a-z0-9]+(?:-[a-z0-9]+)*\.progress\.v[23]$/;
const EXPANSION_PROGRESS_KEYS = ["briliantai.expansion-progress.v3", "briliantai.expansion-progress.v2", "briliantai.expansion-progress.v1"] as const;
const EXACT_KEYS = new Set([ADAPTIVE_STATE_KEY, SOURCE_COURSES_KEY, "briliantai.diagnostic.v1", "briliantai.learning-log.v1", "briliantai.repair-queue.v1", ...EXPANSION_PROGRESS_KEYS]);
const ADAPTIVE_STATE_FIELDS = new Set<keyof AdaptiveState>(["schemaVersion", "sessionMinutes", "lastGeneratedAt", "lastQueueIds"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isAdaptiveStatePayload(value: unknown): value is AdaptiveState {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value);
  return keys.length === ADAPTIVE_STATE_FIELDS.size
    && keys.every((key) => ADAPTIVE_STATE_FIELDS.has(key as keyof AdaptiveState))
    && value.schemaVersion === 1
    && typeof value.sessionMinutes === "number"
    && Number.isFinite(value.sessionMinutes)
    && (value.lastGeneratedAt === null
      || (typeof value.lastGeneratedAt === "string" && Number.isFinite(Date.parse(value.lastGeneratedAt))))
    && Array.isArray(value.lastQueueIds)
    && value.lastQueueIds.every((id) => typeof id === "string");
}

export function isLearningStorageKey(key: string): boolean {
  return LESSON_KEY.test(key) || EXACT_KEYS.has(key);
}

export function createLearningBackup(storage: StorageLike, exportedAt = new Date().toISOString()): LearningBackup {
  const data: Record<string, string> = {};
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
    .filter((key): key is string => Boolean(key && isLearningStorageKey(key)))
    .sort();
  for (const key of keys) {
    const value = storage.getItem(key);
    if (value !== null) data[key] = value;
  }
  return { product: "BriliantAI Lab", schemaVersion: LEARNING_BACKUP_SCHEMA, exportedAt, data };
}

export function parseLearningBackupText(text: string): LearningBackup {
  if (new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES) throw new Error("File backup lớn hơn giới hạn 500 KB.");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("File không phải JSON hợp lệ.");
  }
  if (!raw || typeof raw !== "object") throw new Error("Cấu trúc backup không hợp lệ.");
  const candidate = raw as Partial<LearningBackup>;
  if (candidate.product !== "BriliantAI Lab" || candidate.schemaVersion !== LEARNING_BACKUP_SCHEMA) throw new Error("File không thuộc phiên bản BriliantAI hiện tại.");
  if (typeof candidate.exportedAt !== "string" || !Number.isFinite(Date.parse(candidate.exportedAt))) throw new Error("Thời điểm backup không hợp lệ.");
  if (!candidate.data || typeof candidate.data !== "object" || Array.isArray(candidate.data)) throw new Error("Backup không có vùng dữ liệu hợp lệ.");
  const data = candidate.data as Record<string, string>;
  const entries = Object.entries(data);
  if (entries.length > 100) throw new Error("Backup chứa quá nhiều mục dữ liệu.");
  for (const [key, value] of entries) {
    if (!isLearningStorageKey(key) || typeof value !== "string") throw new Error(`Mục không được phép trong backup: ${key}`);
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new Error(`Dữ liệu của ${key} bị hỏng.`);
    }
    if (LESSON_KEY.test(key)) {
      const lessonId = key.slice("briliantai.lesson.".length).split(".progress.")[0];
      const lesson = lessonCatalog.lessons.find((item) => item.id === lessonId);
      if (!isLessonProgressShape(parsed)
        || (isRecord(parsed) && typeof parsed.currentIndex === "number"
          && (!Number.isInteger(parsed.currentIndex) || parsed.currentIndex < 0 || (lesson && parsed.currentIndex >= lesson.activities.length)))) {
        throw new Error(`Tiến độ bài học không hợp lệ: ${key}`);
      }
    }
    if (key === ADAPTIVE_STATE_KEY) {
      if (!isAdaptiveStatePayload(parsed)) throw new Error("Adaptive state không hợp lệ.");
      data[key] = JSON.stringify(normalizeAdaptiveState(parsed));
    }
    if (key === SOURCE_COURSES_KEY) {
      try { parseSourceCourses(value); } catch { throw new Error("Khóa học từ nguồn trong backup không hợp lệ."); }
    }
  }
  return candidate as LearningBackup;
}

export function summarizeLearningBackup(backup: LearningBackup): LearningBackupSummary {
  const keys = Object.keys(backup.data);
  const lessonIds = new Set(keys.map((key) => key.match(LESSON_KEY)?.[0].split(".progress.")[0]).filter(Boolean));
  let expansionLabCount = 0;
  try {
    const progress = JSON.parse(backup.data[EXPANSION_PROGRESS_KEYS[0]] ?? backup.data[EXPANSION_PROGRESS_KEYS[1]] ?? backup.data[EXPANSION_PROGRESS_KEYS[2]] ?? "null") as { completedLabIds?: unknown } | null;
    expansionLabCount = progress && Array.isArray(progress.completedLabIds)
      ? new Set(progress.completedLabIds.filter((id): id is string => typeof id === "string")).size
      : 0;
  } catch {
    expansionLabCount = 0;
  }
  return {
    itemCount: keys.length,
    lessonCount: lessonIds.size,
    expansionLabCount,
    hasDiagnostic: keys.includes("briliantai.diagnostic.v1"),
    hasAdaptiveState: keys.includes(ADAPTIVE_STATE_KEY),
    hasLearningLog: keys.includes("briliantai.learning-log.v1"),
    hasRepairQueue: keys.includes("briliantai.repair-queue.v1"),
  };
}

export function restoreLearningBackup(backup: LearningBackup, storage: StorageLike): number {
  const entries = Object.entries(backup.data);
  const previous = new Map(entries.map(([key]) => [key, storage.getItem(key)]));
  try {
    for (const [key, value] of entries) storage.setItem(key, value);
  } catch {
    for (const [key, value] of previous) {
      try {
        if (value === null) storage.removeItem(key);
        else storage.setItem(key, value);
      } catch {
        // Best-effort rollback when browser storage itself is unavailable.
      }
    }
    throw new Error("Không thể ghi backup vào bộ nhớ trình duyệt; dữ liệu cũ đã được giữ lại.");
  }
  return entries.length;
}
