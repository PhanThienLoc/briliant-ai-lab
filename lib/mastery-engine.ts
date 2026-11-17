export const REVIEW_DELAY_MS = 72 * 60 * 60 * 1000;

export type ActivityEvidence = {
  independentAt?: string;
  completedAt: string;
  attempts: number;
  hintsUsed: number;
};

export type ReviewEvidence = {
  dueAt: string;
  completedAt: string | null;
  attempts: number;
  correct: boolean;
};

export type LessonProgress = {
  currentIndex: number;
  completed: string[];
  attempts: Record<string, number>;
  hintLevels: Record<string, number>;
  activityEvidence: Record<string, ActivityEvidence>;
  practicedAt: string | null;
  review: ReviewEvidence | null;
};

export type MasteryState = "unexplored" | "practicing" | "practiced" | "review_due" | "mastered";

export const initialLessonProgress: LessonProgress = {
  currentIndex: 0,
  completed: [],
  attempts: {},
  hintLevels: {},
  activityEvidence: {},
  practicedAt: null,
  review: null,
};

export function reviewDueAt(practicedAt: string): string {
  return new Date(new Date(practicedAt).getTime() + REVIEW_DELAY_MS).toISOString();
}

export function completedActivityIds(progress: Pick<LessonProgress, "completed">, activityIds?: readonly string[]): string[] {
  const validIds = activityIds ? new Set(activityIds) : null;
  return [...new Set((Array.isArray(progress.completed) ? progress.completed : [])
    .filter((id): id is string => typeof id === "string" && (!validIds || validIds.has(id))))];
}

export function lessonEvidenceSummary(progress: LessonProgress, activityIds: readonly string[]) {
  const completedIds = completedActivityIds(progress, activityIds);
  const evidence = completedIds.map((id) => ({
    attempts: progress.activityEvidence[id]?.attempts ?? progress.attempts[id] ?? 1,
    hintsUsed: progress.activityEvidence[id]?.hintsUsed ?? progress.hintLevels[id] ?? 0,
  }));
  const completed = evidence.length;
  const independent = evidence.filter((item) => item.hintsUsed === 0).length;
  return {
    completed,
    independent,
    assisted: completed - independent,
    firstAttemptIndependent: evidence.filter((item) => item.attempts === 1 && item.hintsUsed === 0).length,
    attempts: [...new Set(activityIds)].reduce((sum, id) => sum + Math.max(
      progress.attempts[id] ?? 0,
      progress.activityEvidence[id]?.attempts ?? 0,
      completedIds.includes(id) ? 1 : 0,
    ), 0),
  };
}

export function normalizeProgress(value: unknown, totalActivities: number, now = new Date(), activityIds?: readonly string[]): LessonProgress {
  if (!value || typeof value !== "object") return initialLessonProgress;
  const raw = value as Partial<LessonProgress>;
  const completed = completedActivityIds({ completed: raw.completed ?? [] }, activityIds);
  const attempts = raw.attempts && typeof raw.attempts === "object" ? raw.attempts : {};
  const hintLevels = raw.hintLevels && typeof raw.hintLevels === "object" ? raw.hintLevels : {};
  const activityEvidence = raw.activityEvidence && typeof raw.activityEvidence === "object" ? raw.activityEvidence : {};
  const inferredPracticedAt = totalActivities > 0 && completed.length >= totalActivities ? now.toISOString() : null;
  const practicedAt = typeof raw.practicedAt === "string" ? raw.practicedAt : inferredPracticedAt;

  return {
    currentIndex: Number.isFinite(raw.currentIndex) ? Math.max(0, Math.min(Math.floor(Number(raw.currentIndex)), totalActivities - 1)) : 0,
    completed,
    attempts,
    hintLevels,
    activityEvidence,
    practicedAt,
    review: raw.review && typeof raw.review === "object" ? raw.review : null,
  };
}

export function activityEvidenceScore(attempts: number, hintsUsed: number): number {
  if (!Number.isFinite(attempts) || !Number.isFinite(hintsUsed) || attempts <= 0) return 0;
  const retryPenalty = Math.max(0, attempts - 1) * 12;
  const hintPenalty = Math.max(0, hintsUsed) * 18;
  return Math.max(35, 100 - retryPenalty - hintPenalty);
}

export function lessonEvidenceScore(progress: LessonProgress, totalActivities: number, activityIds?: readonly string[]): number {
  if (totalActivities <= 0) return 0;
  const score = completedActivityIds(progress, activityIds).reduce((sum, activityId) => {
    const evidence = progress.activityEvidence[activityId];
    const attempts = evidence?.attempts ?? progress.attempts[activityId] ?? 1;
    const hints = evidence?.hintsUsed ?? progress.hintLevels[activityId] ?? 0;
    return sum + activityEvidenceScore(attempts, hints);
  }, 0);
  return Math.min(100, Math.max(0, Math.round(score / totalActivities)));
}

export function masteryState(progress: LessonProgress, totalActivities: number, now = new Date(), activityIds?: readonly string[]): MasteryState {
  const completed = completedActivityIds(progress, activityIds);
  if (completed.length === 0) return "unexplored";
  if (completed.length < totalActivities || !progress.practicedAt) return "practicing";
  if (progress.review?.correct && progress.review.completedAt) return "mastered";
  const dueAt = progress.review?.dueAt ?? reviewDueAt(progress.practicedAt);
  return now.getTime() >= new Date(dueAt).getTime() ? "review_due" : "practiced";
}

export function masteryLabel(state: MasteryState): string {
  const labels: Record<MasteryState, string> = {
    unexplored: "Chưa học",
    practicing: "Đang luyện",
    practiced: "Chờ ôn",
    review_due: "Đến hạn ôn",
    mastered: "Mastered",
  };
  return labels[state];
}

export function hoursUntilReview(progress: LessonProgress, now = new Date()): number | null {
  if (!progress.practicedAt) return null;
  const dueAt = progress.review?.dueAt ?? reviewDueAt(progress.practicedAt);
  return Math.max(0, Math.ceil((new Date(dueAt).getTime() - now.getTime()) / (60 * 60 * 1000)));
}

// A retry adds independence evidence without erasing the original assisted pass.
export function recordLessonAttempt(progress: LessonProgress, activityId: string, correct: boolean, totalActivities: number, hintsUsed: number, now = new Date(), activityIds?: readonly string[]): LessonProgress {
  progress = { ...progress, completed: completedActivityIds(progress, activityIds) };
  if (activityIds && !activityIds.includes(activityId)) return progress;
  const attempts = (progress.attempts[activityId] ?? 0) + 1;
  const existing = progress.activityEvidence[activityId];
  const wasCompleted = progress.completed.includes(activityId);
  const independentRetry = correct && wasCompleted && hintsUsed === 0 && !existing?.independentAt && (existing?.hintsUsed ?? progress.hintLevels[activityId] ?? 0) > 0;
  const completed = correct && !wasCompleted ? [...progress.completed, activityId] : progress.completed;
  const timestamp = now.toISOString();
  const restartDelay = completed.length === totalActivities && (independentRetry || !progress.practicedAt);
  return {
    ...progress,
    attempts: { ...progress.attempts, [activityId]: attempts },
    completed,
    activityEvidence: correct && (!wasCompleted || independentRetry) ? {
      ...progress.activityEvidence,
      [activityId]: independentRetry
        ? { completedAt: existing?.completedAt ?? progress.practicedAt ?? timestamp, attempts, hintsUsed: existing?.hintsUsed ?? progress.hintLevels[activityId] ?? 0, independentAt: timestamp }
        : { completedAt: timestamp, attempts, hintsUsed },
    } : progress.activityEvidence,
    practicedAt: restartDelay ? timestamp : progress.practicedAt,
    review: restartDelay ? { dueAt: reviewDueAt(timestamp), completedAt: null, correct: false, attempts: progress.review?.attempts ?? 0 } : progress.review,
  };
}

export function persistLessonProgress(storage: () => Pick<Storage, "setItem">, key: string, progress: LessonProgress): string | null {
  try {
    storage().setItem(key, JSON.stringify(progress));
    return null;
  } catch {
    return "Không thể lưu tiến độ trên thiết bị. Phiên học vẫn dùng được; tiến độ mới chưa được lưu vào backup trên thiết bị. Đừng đóng phiên khi chưa lưu được.";
  }
}
