import type { ConceptSnapshot, EvidenceGate } from "./concept-evidence";

export type AdaptiveMasteryState = "unexplored" | "learning" | "practiced" | "review_due" | "mastered";
export type LearningRiskFlag =
  | "hint_dependent"
  | "retry_heavy"
  | "misconception_open"
  | "stale"
  | "prerequisite_blocked";

export type AdaptiveConceptState = ConceptSnapshot & {
  state: AdaptiveMasteryState;
  risks: LearningRiskFlag[];
};

const HOUR_MS = 60 * 60 * 1_000;
const MINIMUM_DELAY_MS = 72 * HOUR_MS;
const STALE_AFTER_MS = 21 * 24 * HOUR_MS;

const gateApplicable = (gate: EvidenceGate) => gate.status !== "not_applicable";
const gateMet = (gate: EvidenceGate) => gate.status === "met";

function timestamp(value: string | null): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function delayedPassIsLegitimate(concept: ConceptSnapshot, now: Date): boolean {
  if (!gateMet(concept.evidence.delayed)) return false;

  const delayedAt = timestamp(concept.evidence.delayed.completedAt);
  if (delayedAt === null || delayedAt > now.getTime()) return false;

  const practiceTimestamps = [
    timestamp(concept.evidence.practice.completedAt),
    timestamp(concept.lastPracticedAt),
    timestamp(concept.evidence.practice.independentAt ?? null),
  ].filter((value): value is number => value !== null);

  return practiceTimestamps.every((practicedAt) => delayedAt - practicedAt >= MINIMUM_DELAY_MS);
}

function masteryState(concept: ConceptSnapshot, now: Date): AdaptiveMasteryState {
  const allGates = Object.values(concept.evidence);
  const applicableGates = allGates.filter(gateApplicable);
  if (!applicableGates.some(gateMet)) return concept.totalAttempts > 0 ? "learning" : "unexplored";

  const nonDelayedGates = [
    concept.evidence.practice,
    concept.evidence.variant,
    concept.evidence.transfer,
  ].filter(gateApplicable);
  if (concept.evidence.practice.hintsUsed > 0 && timestamp(concept.evidence.practice.independentAt ?? null) === null) return "learning";
  if (nonDelayedGates.some((gate) => !gateMet(gate))) return "learning";

  if (delayedPassIsLegitimate(concept, now) && concept.unresolvedMisconceptions === 0) {
    return "mastered";
  }

  const reviewAt = timestamp(concept.nextReviewAt);
  return reviewAt !== null && reviewAt <= now.getTime() ? "review_due" : "practiced";
}

function learningRisks(
  concept: ConceptSnapshot,
  state: AdaptiveMasteryState,
  now: Date,
): LearningRiskFlag[] {
  const risks: LearningRiskFlag[] = [];
  if (concept.totalHints > 0) risks.push("hint_dependent");
  if (concept.retryCount >= 2) risks.push("retry_heavy");
  if (concept.unresolvedMisconceptions > 0) risks.push("misconception_open");

  const delayedAt = timestamp(concept.evidence.delayed.completedAt);
  if (state === "mastered" && delayedAt !== null && now.getTime() - delayedAt > STALE_AFTER_MS) {
    risks.push("stale");
  }

  if (!concept.unlocked || concept.blockedOutgoingEdgeIds.length > 0) {
    risks.push("prerequisite_blocked");
  }

  return risks;
}

export function evaluateAdaptiveMastery(
  concept: ConceptSnapshot,
  now = new Date(),
): AdaptiveConceptState {
  const state = masteryState(concept, now);
  return {
    ...concept,
    state,
    risks: learningRisks(concept, state, now),
  };
}
