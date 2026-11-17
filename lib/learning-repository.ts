import { normalizeDiagnostic, type DiagnosticResult } from "./diagnostic.ts";
import { emptyExpansionProgress, normalizeExpansionProgress, type ExpansionProgress } from "./expansion-progress.ts";
import { lessonCatalog } from "./lesson-catalog.ts";
import { initialLessonProgress, normalizeProgress, type LessonProgress } from "./mastery-engine.ts";
import type { LearningEventType, LearningOutcome, LocalLearningEvent } from "./local-learning-log.ts";

export const ADAPTIVE_STATE_KEY = "briliantai.adaptive-state.v1";

const DIAGNOSTIC_KEY = "briliantai.diagnostic.v1";
const REPAIR_QUEUE_KEY = "briliantai.repair-queue.v1";
const LEARNING_LOG_KEY = "briliantai.learning-log.v1";
const EXPANSION_KEYS = [
  "briliantai.expansion-progress.v3",
  "briliantai.expansion-progress.v2",
  "briliantai.expansion-progress.v1",
] as const;
const MAX_REPAIR_ITEMS = 50;
const MAX_HISTORY_EVENTS = 400;

const repairReasons = new Set<RepairItemSnapshot["reason"]>([
  "copied_hint",
  "keyword_dump",
  "too_short",
  "missing_concepts",
  "unlinked_concepts",
]);
const learningEventTypes = new Set<LearningEventType>([
  "diagnostic_completed",
  "activity_attempt",
  "hint_opened",
  "code_run",
  "lesson_completed",
  "delayed_review",
  "scoring_dispute",
  "repair_created",
  "repair_resolved",
]);
const learningOutcomes = new Set<LearningOutcome>([
  "pass",
  "fail",
  "opened",
  "completed",
  "timeout",
  "runtime_error",
  "submitted",
]);

export type AdaptiveState = {
  schemaVersion: 1;
  sessionMinutes: number;
  lastGeneratedAt: string | null;
  lastQueueIds: string[];
};

export type RepairItemSnapshot = {
  id: string;
  lessonId: string;
  activityId: string;
  lessonTitle: string;
  activityLabel: string;
  reason: "copied_hint" | "keyword_dump" | "too_short" | "missing_concepts" | "unlinked_concepts";
  title: string;
  prompt: string;
  attempts: number;
  hintLevel: number;
  disputed: boolean;
  updatedAt: string;
};

export type LearningStorageWarning = {
  domain: string;
  code: "invalid_json" | "invalid_shape" | "write_failed";
  message: string;
};

export type LearningRepositorySnapshot = {
  lessons: Record<string, LessonProgress>;
  expansion: ExpansionProgress;
  diagnostic: DiagnosticResult | null;
  repairs: RepairItemSnapshot[];
  history: LocalLearningEvent[];
  adaptive: AdaptiveState;
  warnings: LearningStorageWarning[];
};

export type RepositoryWriteResult =
  | { ok: true }
  | { ok: false; warning: LearningStorageWarning };

export interface LearningRepository {
  readSnapshot(now?: Date): Promise<LearningRepositorySnapshot>;
  writeAdaptiveState(state: AdaptiveState): Promise<RepositoryWriteResult>;
}

type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

type ParsedStorageValue = {
  present: boolean;
  value: unknown;
  warning: LearningStorageWarning | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isDateString(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function optional(record: Record<string, unknown>, key: string, valid: (value: unknown) => boolean): boolean {
  return !(key in record) || valid(record[key]);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isNumberRecord(value: unknown): boolean {
  return isRecord(value) && Object.values(value).every(isFiniteNumber);
}

function isDateRecord(value: unknown): boolean {
  return isRecord(value) && Object.values(value).every(isDateString);
}

function invalidShape(domain: string): LearningStorageWarning {
  return {
    domain,
    code: "invalid_shape",
    message: `Stored ${domain} data has an invalid shape.`,
  };
}

function safeJson(raw: string | null, domain: string): ParsedStorageValue {
  if (raw === null) return { present: false, value: null, warning: null };
  try {
    return { present: true, value: JSON.parse(raw), warning: null };
  } catch {
    return {
      present: true,
      value: null,
      warning: {
        domain,
        code: "invalid_json",
        message: `Stored ${domain} data is not valid JSON.`,
      },
    };
  }
}

function readPreferred(storage: StorageLike, keys: readonly string[], domain: string): ParsedStorageValue {
  for (const key of keys) {
    const raw = storage.getItem(key);
    if (raw !== null) return safeJson(raw, domain);
  }
  return safeJson(null, domain);
}

function emptyLessonProgress(): LessonProgress {
  return {
    ...initialLessonProgress,
    completed: [],
    attempts: {},
    hintLevels: {},
    activityEvidence: {},
  };
}

function isActivityEvidenceRecord(value: unknown): boolean {
  return isRecord(value) && Object.values(value).every((item) => isRecord(item)
    && isDateString(item.completedAt)
    && optional(item, "independentAt", isDateString)
    && isFiniteNumber(item.attempts)
    && isFiniteNumber(item.hintsUsed));
}

function isReview(value: unknown): boolean {
  return isRecord(value)
    && isDateString(value.dueAt)
    && (value.completedAt === null || isDateString(value.completedAt))
    && isFiniteNumber(value.attempts)
    && typeof value.correct === "boolean";
}

export function isLessonProgressShape(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return optional(value, "currentIndex", isFiniteNumber)
    && optional(value, "completed", isStringArray)
    && optional(value, "attempts", isNumberRecord)
    && optional(value, "hintLevels", isNumberRecord)
    && optional(value, "activityEvidence", isActivityEvidenceRecord)
    && optional(value, "practicedAt", (item) => item === null || isDateString(item))
    && optional(value, "review", (item) => item === null || isReview(item));
}

function isExpansionReviewRecord(value: unknown): boolean {
  return isRecord(value) && Object.values(value).every((review) => isRecord(review)
    && isDateString(review.dueAt)
    && isFiniteNumber(review.attempts)
    && optional(review, "passedAt", isDateString));
}

function isExpansionProgressShape(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return optional(value, "completedLabIds", isStringArray)
    && optional(value, "hintedLabIds", isStringArray)
    && optional(value, "attempts", isNumberRecord)
    && optional(value, "completedAt", isDateRecord)
    && optional(value, "independentAt", isDateRecord)
    && optional(value, "reviews", isExpansionReviewRecord)
    && optional(value, "passedEdgeIds", isStringArray)
    && optional(value, "edgeAttempts", isNumberRecord);
}

function isDiagnosticShape(value: unknown): boolean {
  return isRecord(value)
    && isDateString(value.completedAt)
    && isRecord(value.answers)
    && Object.values(value.answers).every(isFiniteNumber);
}

function isAdaptiveShape(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return optional(value, "schemaVersion", (item) => item === 1)
    && optional(value, "sessionMinutes", isFiniteNumber)
    && optional(value, "lastGeneratedAt", (item) => item === null || isDateString(item))
    && optional(value, "lastQueueIds", Array.isArray);
}

function isRepairItem(value: unknown): value is Record<string, unknown> {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.lessonId === "string"
    && typeof value.activityId === "string"
    && typeof value.lessonTitle === "string"
    && typeof value.activityLabel === "string"
    && typeof value.reason === "string"
    && repairReasons.has(value.reason as RepairItemSnapshot["reason"])
    && typeof value.title === "string"
    && typeof value.prompt === "string"
    && isFiniteNumber(value.attempts)
    && isFiniteNumber(value.hintLevel)
    && typeof value.disputed === "boolean"
    && isDateString(value.updatedAt);
}

function normalizeRepairItems(value: unknown): RepairItemSnapshot[] | null {
  if (!Array.isArray(value) || !value.every(isRepairItem)) return null;
  return value.slice(-MAX_REPAIR_ITEMS).map((item) => ({
    id: item.id as string,
    lessonId: item.lessonId as string,
    activityId: item.activityId as string,
    lessonTitle: item.lessonTitle as string,
    activityLabel: item.activityLabel as string,
    reason: item.reason as RepairItemSnapshot["reason"],
    title: item.title as string,
    prompt: item.prompt as string,
    attempts: Math.max(0, Math.min(99, Math.round(item.attempts as number))),
    hintLevel: Math.max(0, Math.min(2, Math.round(item.hintLevel as number))),
    disputed: item.disputed as boolean,
    updatedAt: item.updatedAt as string,
  }));
}

function isHistoryItem(value: unknown): value is Record<string, unknown> {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.eventType === "string"
    && learningEventTypes.has(value.eventType as LearningEventType)
    && isDateString(value.occurredAt)
    && optional(value, "lessonId", (item) => typeof item === "string")
    && optional(value, "activityId", (item) => typeof item === "string")
    && optional(value, "outcome", (item) => typeof item === "string" && learningOutcomes.has(item as LearningOutcome))
    && optional(value, "hintLevel", isFiniteNumber)
    && optional(value, "durationMs", isFiniteNumber)
    && optional(value, "errorCode", (item) => typeof item === "string");
}

function normalizeHistory(value: unknown): LocalLearningEvent[] | null {
  if (!Array.isArray(value) || !value.every(isHistoryItem)) return null;
  return value.slice(-MAX_HISTORY_EVENTS).map((item) => ({
    id: item.id as string,
    eventType: item.eventType as LearningEventType,
    ...(typeof item.lessonId === "string" ? { lessonId: item.lessonId } : {}),
    ...(typeof item.activityId === "string" ? { activityId: item.activityId } : {}),
    ...(typeof item.outcome === "string" ? { outcome: item.outcome as LearningOutcome } : {}),
    ...(typeof item.hintLevel === "number" ? { hintLevel: Math.max(0, Math.min(2, Math.round(item.hintLevel))) } : {}),
    ...(typeof item.durationMs === "number" ? { durationMs: Math.max(0, Math.min(3_600_000, Math.round(item.durationMs))) } : {}),
    ...(typeof item.errorCode === "string" ? { errorCode: item.errorCode } : {}),
    occurredAt: item.occurredAt as string,
  }));
}

export function normalizeAdaptiveState(value: unknown): AdaptiveState {
  const candidate = isRecord(value) ? value : {};
  const sessionMinutes = isFiniteNumber(candidate.sessionMinutes)
    ? Math.max(15, Math.min(60, Math.round(candidate.sessionMinutes)))
    : 30;
  const lastQueueIds = Array.isArray(candidate.lastQueueIds)
    ? [...new Set(candidate.lastQueueIds.filter((item): item is string => typeof item === "string"))].slice(0, 4)
    : [];
  return {
    schemaVersion: 1,
    sessionMinutes,
    lastGeneratedAt: isDateString(candidate.lastGeneratedAt) ? candidate.lastGeneratedAt : null,
    lastQueueIds,
  };
}

function consumeParsed<T>(
  parsed: ParsedStorageValue,
  domain: string,
  warnings: LearningStorageWarning[],
  isShape: (value: unknown) => boolean,
  normalize: (value: unknown) => T,
  fallback: () => T,
): T {
  if (!parsed.present) return fallback();
  if (parsed.warning) {
    warnings.push(parsed.warning);
    return fallback();
  }
  if (!isShape(parsed.value)) {
    warnings.push(invalidShape(domain));
    return fallback();
  }
  return normalize(parsed.value);
}

export function createLocalStorageLearningRepository(storage: StorageLike): LearningRepository {
  return {
    async readSnapshot(now = new Date()) {
      const warnings: LearningStorageWarning[] = [];
      const lessons = Object.fromEntries(lessonCatalog.lessons.map((lesson) => {
        const domain = `lesson:${lesson.id}`;
        const parsed = readPreferred(storage, [
          `briliantai.lesson.${lesson.id}.progress.v3`,
          `briliantai.lesson.${lesson.id}.progress.v2`,
        ], domain);
        const progress = consumeParsed(
          parsed,
          domain,
          warnings,
          isLessonProgressShape,
          (value) => normalizeProgress(value, lesson.activities.length, now, lesson.activities.map((activity) => activity.id)),
          emptyLessonProgress,
        );
        return [lesson.id, progress];
      }));

      const expansion = consumeParsed(
        readPreferred(storage, EXPANSION_KEYS, "expansion"),
        "expansion",
        warnings,
        isExpansionProgressShape,
        (value) => normalizeExpansionProgress(value, now.getTime()),
        () => structuredClone(emptyExpansionProgress),
      );

      const diagnosticParsed = readPreferred(storage, [DIAGNOSTIC_KEY], "diagnostic");
      let diagnostic: DiagnosticResult | null = null;
      if (diagnosticParsed.present) {
        if (diagnosticParsed.warning) {
          warnings.push(diagnosticParsed.warning);
        } else if (!isDiagnosticShape(diagnosticParsed.value) || !(diagnostic = normalizeDiagnostic(diagnosticParsed.value))) {
          warnings.push(invalidShape("diagnostic"));
        }
      }

      const repairs = consumeParsed(
        readPreferred(storage, [REPAIR_QUEUE_KEY], "repairs"),
        "repairs",
        warnings,
        (value) => normalizeRepairItems(value) !== null,
        (value) => normalizeRepairItems(value) ?? [],
        () => [],
      );
      const history = consumeParsed(
        readPreferred(storage, [LEARNING_LOG_KEY], "history"),
        "history",
        warnings,
        (value) => normalizeHistory(value) !== null,
        (value) => normalizeHistory(value) ?? [],
        () => [],
      );
      const adaptive = consumeParsed(
        readPreferred(storage, [ADAPTIVE_STATE_KEY], "adaptive"),
        "adaptive",
        warnings,
        isAdaptiveShape,
        normalizeAdaptiveState,
        () => normalizeAdaptiveState(null),
      );

      return { lessons, expansion, diagnostic, repairs, history, adaptive, warnings };
    },

    async writeAdaptiveState(state) {
      try {
        storage.setItem(ADAPTIVE_STATE_KEY, JSON.stringify(normalizeAdaptiveState(state)));
        return { ok: true };
      } catch {
        return {
          ok: false,
          warning: {
            domain: "adaptive",
            code: "write_failed",
            message: "Adaptive state could not be saved.",
          },
        };
      }
    },
  };
}

export function createMemoryLearningRepository(snapshot: LearningRepositorySnapshot): LearningRepository {
  let current = structuredClone(snapshot);
  return {
    async readSnapshot() {
      return structuredClone(current);
    },
    async writeAdaptiveState(state) {
      current = { ...current, adaptive: structuredClone(normalizeAdaptiveState(state)) };
      return { ok: true };
    },
  };
}
