import { expansionLabs, prerequisiteEdges, type ExpansionTrackId } from "./expansion-catalog.ts";
import { isExpansionLabUnlocked } from "./expansion-progress.ts";
import { lessonCatalog } from "./lesson-catalog.ts";
import type { LearningRepositorySnapshot } from "./learning-repository.ts";
import { reviewDueAt, type LessonProgress } from "./mastery-engine.ts";

export type EvidenceGate = {
  independentAt?: string;
  status: "met" | "missing" | "not_applicable";
  completedAt: string | null;
  attempts: number;
  hintsUsed: number;
};

export type ConceptSnapshot = {
  id: string;
  title: string;
  trackId: "r0" | ExpansionTrackId;
  prerequisites: string[];
  evidence: {
    practice: EvidenceGate;
    variant: EvidenceGate;
    transfer: EvidenceGate;
    delayed: EvidenceGate;
  };
  totalAttempts: number;
  retryCount: number;
  totalHints: number;
  unresolvedMisconceptions: number;
  lastPracticedAt: string | null;
  nextReviewAt: string | null;
  blockedOutgoingEdgeIds: string[];
  unlocked: boolean;
};

type ActivityCounts = {
  completedAt: string | null;
  attempts: number;
  hintsUsed: number;
};

const notApplicableGate = (): EvidenceGate => ({
  status: "not_applicable",
  completedAt: null,
  attempts: 0,
  hintsUsed: 0,
});

function activityCounts(progress: LessonProgress, activityId: string): ActivityCounts {
  const evidence = progress.activityEvidence[activityId];
  return {
    completedAt: evidence?.completedAt ?? null,
    attempts: Math.max(evidence?.attempts ?? 0, progress.attempts[activityId] ?? 0, progress.completed.includes(activityId) ? 1 : 0),
    hintsUsed: evidence?.hintsUsed ?? progress.hintLevels[activityId] ?? 0,
  };
}

function latestTimestamp(timestamps: Array<string | null>): string | null {
  return timestamps.reduce<string | null>((latest, timestamp) => {
    if (!timestamp) return latest;
    if (!latest || Date.parse(timestamp) > Date.parse(latest)) return timestamp;
    return latest;
  }, null);
}

function activityGate(progress: LessonProgress, activityIds: string[], independent = false): EvidenceGate {
  const counts = activityIds.map((activityId) => activityCounts(progress, activityId));
  const met = activityIds.every((activityId) => progress.completed.includes(activityId) && (!independent || activityCounts(progress, activityId).hintsUsed === 0 || Boolean(progress.activityEvidence[activityId]?.independentAt)));
  return {
    ...(independent && met && counts.some((item) => item.hintsUsed > 0) ? { independentAt: latestTimestamp(activityIds.map((id) => progress.activityEvidence[id]?.independentAt ?? null))! } : {}),
    status: met ? "met" : "missing",
    completedAt: met ? latestTimestamp(counts.map((item) => item.completedAt)) ?? progress.practicedAt : null,
    attempts: counts.reduce((sum, item) => sum + item.attempts, 0),
    hintsUsed: counts.reduce((sum, item) => sum + item.hintsUsed, 0),
  };
}

function delayedLessonGate(progress: LessonProgress): EvidenceGate {
  const met = Boolean(progress.review?.correct && progress.review.completedAt);
  return {
    status: met ? "met" : "missing",
    completedAt: met ? progress.review?.completedAt ?? null : null,
    attempts: progress.review?.attempts ?? 0,
    hintsUsed: 0,
  };
}

function unresolvedCount(snapshot: LearningRepositorySnapshot, conceptId: string): number {
  return snapshot.repairs.filter((repair) => repair.lessonId === conceptId).length;
}

export function projectConceptEvidence(
  snapshot: LearningRepositorySnapshot,
  now = new Date(),
): ConceptSnapshot[] {
  void now;

  const lessons = lessonCatalog.lessons.map((lesson): ConceptSnapshot => {
    const progress = snapshot.lessons[lesson.id];
    const activityIds = lesson.activities.map((activity) => activity.id);
    const counts = progress ? activityIds.map((activityId) => activityCounts(progress, activityId)) : [];

    return {
      id: lesson.id,
      title: lesson.title,
      trackId: "r0",
      prerequisites: [],
      evidence: {
        practice: progress ? activityGate(progress, activityIds.slice(0, 2), true) : activityGateFromEmpty(),
        variant: progress ? activityGate(progress, activityIds.slice(2, 3)) : activityGateFromEmpty(),
        transfer: progress ? activityGate(progress, activityIds.slice(3, 5)) : activityGateFromEmpty(),
        delayed: progress ? delayedLessonGate(progress) : activityGateFromEmpty(),
      },
      totalAttempts: counts.reduce((sum, item) => sum + item.attempts, 0),
      retryCount: counts.reduce((sum, item) => sum + Math.max(0, item.attempts - 1), 0),
      totalHints: counts.reduce((sum, item) => sum + item.hintsUsed, 0),
      unresolvedMisconceptions: unresolvedCount(snapshot, lesson.id),
      lastPracticedAt: progress?.practicedAt ?? null,
      nextReviewAt: progress?.review?.dueAt ?? (progress?.practicedAt ? reviewDueAt(progress.practicedAt) : null),
      blockedOutgoingEdgeIds: [],
      unlocked: true,
    };
  });

  const expansion = expansionLabs.map((lab): ConceptSnapshot => {
    const completed = snapshot.expansion.completedLabIds.includes(lab.id);
    const attempts = snapshot.expansion.attempts[lab.id] ?? 0;
    const hinted = snapshot.expansion.hintedLabIds.includes(lab.id);
    const review = snapshot.expansion.reviews[lab.id];
    const reviewPassed = Boolean(review?.passedAt);

    return {
      id: lab.id,
      title: lab.title,
      trackId: lab.trackId,
      prerequisites: [...lab.prerequisites],
      evidence: {
        practice: {
          ...(snapshot.expansion.independentAt?.[lab.id] ? { independentAt: snapshot.expansion.independentAt[lab.id] } : {}),
          status: completed && (!hinted || Boolean(snapshot.expansion.independentAt?.[lab.id])) ? "met" : "missing",
          completedAt: completed ? snapshot.expansion.completedAt[lab.id] ?? null : null,
          attempts,
          hintsUsed: hinted ? 1 : 0,
        },
        variant: notApplicableGate(),
        transfer: notApplicableGate(),
        delayed: {
          status: reviewPassed ? "met" : "missing",
          completedAt: reviewPassed ? review?.passedAt ?? null : null,
          attempts: review?.attempts ?? 0,
          hintsUsed: 0,
        },
      },
      totalAttempts: attempts,
      retryCount: Math.max(0, attempts - 1),
      totalHints: hinted ? 1 : 0,
      unresolvedMisconceptions: unresolvedCount(snapshot, lab.id),
      lastPracticedAt: completed ? snapshot.expansion.independentAt?.[lab.id] ?? snapshot.expansion.completedAt[lab.id] ?? null : null,
      nextReviewAt: review?.dueAt ?? null,
      blockedOutgoingEdgeIds: prerequisiteEdges
        .filter((edge) => edge.from === lab.id && !snapshot.expansion.passedEdgeIds.includes(edge.id))
        .map((edge) => edge.id),
      unlocked: isExpansionLabUnlocked(snapshot.expansion, lab.id),
    };
  });

  return [...lessons, ...expansion];
}

function activityGateFromEmpty(): EvidenceGate {
  return {
    status: "missing",
    completedAt: null,
    attempts: 0,
    hintsUsed: 0,
  };
}
