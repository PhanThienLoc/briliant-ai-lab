import { expansionLabs, getExpansionLab, getPrerequisiteEdge, isExpansionLabId, prerequisiteEdges, type ExpansionEdgeId, type ExpansionLabId } from "./expansion-catalog.ts";

export const EXPANSION_PROGRESS_KEY = "briliantai.expansion-progress.v3";
export const LEGACY_EXPANSION_PROGRESS_KEYS = ["briliantai.expansion-progress.v2", "briliantai.expansion-progress.v1"] as const;
export const EXPANSION_REVIEW_DELAY_MS = 72 * 60 * 60 * 1_000;

export type ExpansionReviewState = {
  dueAt: string;
  attempts: number;
  passedAt?: string;
};

export type ExpansionProgress = {
  independentAt?: Partial<Record<ExpansionLabId, string>>;
  completedLabIds: ExpansionLabId[];
  hintedLabIds: ExpansionLabId[];
  attempts: Partial<Record<ExpansionLabId, number>>;
  completedAt: Partial<Record<ExpansionLabId, string>>;
  reviews: Partial<Record<ExpansionLabId, ExpansionReviewState>>;
  passedEdgeIds: ExpansionEdgeId[];
  edgeAttempts: Partial<Record<ExpansionEdgeId, number>>;
};

export const emptyExpansionProgress: ExpansionProgress = {
  completedLabIds: [], hintedLabIds: [], attempts: {}, completedAt: {}, reviews: {}, passedEdgeIds: [], edgeAttempts: {},
};

const isDate = (value: unknown): value is string => typeof value === "string" && Number.isFinite(Date.parse(value));
const boundedCount = (value: unknown) => Math.max(0, Math.min(99, Math.round(Number(value) || 0)));

export function normalizeExpansionProgress(value: unknown, now = Date.now()): ExpansionProgress {
  if (!value || typeof value !== "object") return emptyExpansionProgress;
  const candidate = value as Partial<ExpansionProgress>;
  const completedLabIds = Array.isArray(candidate.completedLabIds)
    ? [...new Set(candidate.completedLabIds.filter((id): id is ExpansionLabId => typeof id === "string" && isExpansionLabId(id)))]
    : [];
  const hintedLabIds = Array.isArray(candidate.hintedLabIds)
    ? [...new Set(candidate.hintedLabIds.filter((id): id is ExpansionLabId => typeof id === "string" && isExpansionLabId(id)))]
    : [];
  const attempts = Object.fromEntries(Object.entries(candidate.attempts ?? {}).filter(([id]) => isExpansionLabId(id)).map(([id, count]) => [id, boundedCount(count)]));
  const edgeIds = new Set(prerequisiteEdges.map((edge) => edge.id));
  const passedEdgeIds = Array.isArray(candidate.passedEdgeIds)
    ? [...new Set(candidate.passedEdgeIds.filter((id): id is ExpansionEdgeId => typeof id === "string" && edgeIds.has(id as ExpansionEdgeId)))]
    : [];
  const edgeAttempts = Object.fromEntries(Object.entries(candidate.edgeAttempts ?? {}).filter(([id]) => edgeIds.has(id as ExpansionEdgeId)).map(([id, count]) => [id, boundedCount(count)]));
  const completedAt = Object.fromEntries(Object.entries(candidate.completedAt ?? {}).filter(([id, date]) => isExpansionLabId(id) && isDate(date)));
  const reviews: ExpansionProgress["reviews"] = {};

  for (const labId of completedLabIds) {
    const raw = candidate.reviews?.[labId];
    const finishedAt = isDate(completedAt[labId]) ? completedAt[labId] : new Date(now).toISOString();
    completedAt[labId] = finishedAt;
    reviews[labId] = {
      dueAt: raw && isDate(raw.dueAt) ? raw.dueAt : new Date(Date.parse(finishedAt) + EXPANSION_REVIEW_DELAY_MS).toISOString(),
      attempts: boundedCount(raw?.attempts),
      ...(raw && isDate(raw.passedAt) ? { passedAt: raw.passedAt } : {}),
    };
  }

  return { completedLabIds, hintedLabIds, attempts, completedAt, reviews, passedEdgeIds, edgeAttempts, ...(candidate.independentAt ? { independentAt: Object.fromEntries(Object.entries(candidate.independentAt).filter(([id, date]) => isExpansionLabId(id) && isDate(date))) } : {}) };
}

export function isExpansionLabUnlocked(progress: ExpansionProgress, labId: ExpansionLabId): boolean {
  if (progress.completedLabIds.includes(labId)) return true;
  return getExpansionLab(labId).prerequisites.every((prerequisite) => {
    const edge = getPrerequisiteEdge(prerequisite, labId);
    return progress.completedLabIds.includes(prerequisite) && Boolean(edge && progress.passedEdgeIds.includes(edge.id));
  });
}

export function submitPrerequisiteEdge(progress: ExpansionProgress, edgeId: ExpansionEdgeId, answerIndex: number) {
  const edge = prerequisiteEdges.find((candidate) => candidate.id === edgeId);
  if (!edge || !progress.completedLabIds.includes(edge.from)) return { progress, passed: false, reason: "locked" as const };
  const passed = answerIndex === edge.answerIndex;
  const alreadyPassed = progress.passedEdgeIds.includes(edgeId);
  const next = {
    ...progress,
    passedEdgeIds: passed && !alreadyPassed ? [...progress.passedEdgeIds, edgeId] : progress.passedEdgeIds,
    edgeAttempts: { ...progress.edgeAttempts, [edgeId]: Math.min(99, (progress.edgeAttempts[edgeId] ?? 0) + 1) },
  };
  return { progress: next, passed, reason: passed ? "passed" as const : "incorrect" as const };
}

export function completeExpansionLab(progress: ExpansionProgress, labId: ExpansionLabId, now = Date.now(), hintLevel = 0): ExpansionProgress {
  if (!isExpansionLabUnlocked(progress, labId)) return progress;
  const alreadyCompleted = progress.completedLabIds.includes(labId);
  const completedAt = alreadyCompleted && isDate(progress.completedAt[labId]) ? progress.completedAt[labId] : new Date(now).toISOString();
  const independentRetry = alreadyCompleted && progress.hintedLabIds.includes(labId) && !progress.independentAt?.[labId] && hintLevel === 0;
  const existingReview = independentRetry ? undefined : progress.reviews[labId];
  return {
    ...progress,
    ...(independentRetry ? { independentAt: { ...progress.independentAt, [labId]: new Date(now).toISOString() } } : {}),
    completedLabIds: alreadyCompleted ? progress.completedLabIds : [...progress.completedLabIds, labId],
    hintedLabIds: hintLevel > 0 && !progress.hintedLabIds.includes(labId) ? [...progress.hintedLabIds, labId] : progress.hintedLabIds,
    attempts: { ...progress.attempts, [labId]: Math.min(99, (progress.attempts[labId] ?? 0) + 1) },
    completedAt: { ...progress.completedAt, [labId]: completedAt },
    reviews: {
      ...progress.reviews,
      [labId]: existingReview ?? { dueAt: new Date((independentRetry ? now : Date.parse(completedAt)) + EXPANSION_REVIEW_DELAY_MS).toISOString(), attempts: progress.reviews[labId]?.attempts ?? 0 },
    },
    passedEdgeIds: progress.passedEdgeIds,
    edgeAttempts: progress.edgeAttempts,
  };
}

export function recordExpansionAttempt(progress: ExpansionProgress, labId: ExpansionLabId, hintLevel = 0): ExpansionProgress {
  return {
    ...progress,
    hintedLabIds: hintLevel > 0 && !progress.hintedLabIds.includes(labId) ? [...progress.hintedLabIds, labId] : progress.hintedLabIds,
    attempts: { ...progress.attempts, [labId]: Math.min(99, (progress.attempts[labId] ?? 0) + 1) },
  };
}

export function submitExpansionReview(progress: ExpansionProgress, labId: ExpansionLabId, answerIndex: number, now = Date.now()) {
  const review = progress.reviews[labId];
  if (!review || Date.parse(review.dueAt) > now || review.passedAt) return { progress, passed: false, reason: "not_due" as const };
  const passed = answerIndex === getExpansionLab(labId).review.answerIndex;
  const nextReview = { ...review, attempts: Math.min(99, review.attempts + 1), ...(passed ? { passedAt: new Date(now).toISOString() } : {}) };
  return { progress: { ...progress, reviews: { ...progress.reviews, [labId]: nextReview } }, passed, reason: passed ? "passed" as const : "incorrect" as const };
}

export function dueExpansionReviews(progress: ExpansionProgress, now = Date.now()): ExpansionLabId[] {
  return expansionLabs.filter((lab) => {
    const review = progress.reviews[lab.id];
    return review && !review.passedAt && Date.parse(review.dueAt) <= now;
  }).map((lab) => lab.id);
}

export function masteredExpansionLabs(progress: ExpansionProgress): ExpansionLabId[] {
  return expansionLabs.filter((lab) => Boolean(progress.reviews[lab.id]?.passedAt) && (!progress.hintedLabIds.includes(lab.id) || Boolean(progress.independentAt?.[lab.id]))).map((lab) => lab.id);
}
