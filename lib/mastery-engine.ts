export const REVIEW_DELAY_MS = 72 * 60 * 60 * 1000;

export type ActivityEvidence = {
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

export function normalizeProgress(value: unknown, totalActivities: number, now = new Date()): LessonProgress {
  if (!value || typeof value !== "object") return initialLessonProgress;
  const raw = value as Partial<LessonProgress>;
  const completed = Array.isArray(raw.completed) ? raw.completed.filter((id): id is string => typeof id === "string") : [];
  const attempts = raw.attempts && typeof raw.attempts === "object" ? raw.attempts : {};
  const hintLevels = raw.hintLevels && typeof raw.hintLevels === "object" ? raw.hintLevels : {};
  const activityEvidence = raw.activityEvidence && typeof raw.activityEvidence === "object" ? raw.activityEvidence : {};
  const inferredPracticedAt = completed.length >= totalActivities ? now.toISOString() : null;
  const practicedAt = typeof raw.practicedAt === "string" ? raw.practicedAt : inferredPracticedAt;

  return {
    currentIndex: Number.isFinite(raw.currentIndex) ? Math.max(0, Number(raw.currentIndex)) : 0,
    completed,
    attempts,
    hintLevels,
    activityEvidence,
    practicedAt,
    review: raw.review && typeof raw.review === "object" ? raw.review : null,
  };
}

export function activityEvidenceScore(attempts: number, hintsUsed: number): number {
  if (attempts <= 0) return 0;
  const retryPenalty = Math.max(0, attempts - 1) * 12;
  const hintPenalty = hintsUsed * 18;
  return Math.max(35, 100 - retryPenalty - hintPenalty);
}

export function lessonEvidenceScore(progress: LessonProgress, totalActivities: number): number {
  if (totalActivities <= 0) return 0;
  const score = progress.completed.reduce((sum, activityId) => {
    const evidence = progress.activityEvidence[activityId];
    const attempts = evidence?.attempts ?? progress.attempts[activityId] ?? 1;
    const hints = evidence?.hintsUsed ?? progress.hintLevels[activityId] ?? 0;
    return sum + activityEvidenceScore(attempts, hints);
  }, 0);
  return Math.round(score / totalActivities);
}

export function masteryState(progress: LessonProgress, totalActivities: number, now = new Date()): MasteryState {
  if (progress.completed.length === 0) return "unexplored";
  if (progress.completed.length < totalActivities || !progress.practicedAt) return "practicing";
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
