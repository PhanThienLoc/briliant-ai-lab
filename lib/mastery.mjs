export const MASTERY_STATES = ["unseen", "learning", "practiced", "mastered", "needs_review"];

export function nextMasteryState(state, evidence) {
  if (!MASTERY_STATES.includes(state)) {
    throw new TypeError(`Unknown mastery state: ${state}`);
  }

  if (evidence.criticalMisconception) return "needs_review";
  if (state === "mastered" && evidence.delayedCorrect === false) return "needs_review";

  const independent = evidence.standardCorrect && evidence.hintLevel === 0;
  const transferable = evidence.variantCorrect && evidence.transferCorrect;
  const retained = evidence.delayedCorrect && evidence.delayHours >= 72;

  if (independent && transferable && retained) return "mastered";
  if (independent && evidence.variantCorrect) return "practiced";
  if (evidence.attempted) return "learning";
  return state;
}
