import assert from "node:assert/strict";
import test from "node:test";
import { evaluateAdaptiveMastery } from "../lib/adaptive-mastery.ts";

const missing = () => ({ status: "missing", completedAt: null, attempts: 0, hintsUsed: 0 });
const notApplicable = () => ({ status: "not_applicable", completedAt: null, attempts: 0, hintsUsed: 0 });
const met = (completedAt = "2026-09-01T00:00:00.000Z", attempts = 1, hintsUsed = 0) => ({
  status: "met",
  completedAt,
  attempts,
  hintsUsed,
});

function concept(overrides = {}) {
  return {
    id: "vectors",
    title: "Vector và dot product",
    trackId: "r0",
    prerequisites: [],
    evidence: {
      practice: missing(),
      variant: missing(),
      transfer: missing(),
      delayed: missing(),
    },
    totalAttempts: 0,
    retryCount: 0,
    totalHints: 0,
    unresolvedMisconceptions: 0,
    lastPracticedAt: null,
    nextReviewAt: null,
    blockedOutgoingEdgeIds: [],
    unlocked: true,
    ...overrides,
  };
}

test("mastery follows applicable evidence gates and the injected review clock", () => {
  const now = new Date("2026-09-05T00:00:00.000Z");

  assert.equal(evaluateAdaptiveMastery(concept(), now).state, "unexplored");
  assert.equal(evaluateAdaptiveMastery(concept({
    evidence: { practice: met(), variant: missing(), transfer: missing(), delayed: missing() },
  }), now).state, "learning");
  assert.equal(evaluateAdaptiveMastery(concept({
    evidence: { practice: met(), variant: met(), transfer: met(), delayed: missing() },
    nextReviewAt: "2026-09-06T00:00:00.000Z",
  }), now).state, "practiced");
  assert.equal(evaluateAdaptiveMastery(concept({
    evidence: { practice: met(), variant: met(), transfer: met(), delayed: missing() },
    nextReviewAt: now.toISOString(),
  }), now).state, "review_due");
  assert.equal(evaluateAdaptiveMastery(concept({
    evidence: {
      practice: met("2026-09-01T00:00:00.000Z"),
      variant: notApplicable(),
      transfer: notApplicable(),
      delayed: met("2026-09-04T00:00:00.000Z"),
    },
    lastPracticedAt: "2026-09-01T00:00:00.000Z",
  }), now).state, "mastered");
});

test("mastered requires a delayed pass at least 72 hours after the latest practice timestamp", () => {
  const now = new Date("2026-09-05T00:00:00.000Z");
  const evidence = {
    practice: met("2026-09-01T00:00:00.000Z"),
    variant: met(),
    transfer: met(),
    delayed: met("2026-09-04T11:59:59.999Z"),
  };

  const result = evaluateAdaptiveMastery(concept({
    evidence,
    lastPracticedAt: "2026-09-01T12:00:00.000Z",
    nextReviewAt: "2026-09-04T12:00:00.000Z",
  }), now);

  assert.equal(result.evidence.delayed.status, "met");
  assert.equal(result.state, "review_due");

  assert.equal(evaluateAdaptiveMastery(concept({
    evidence: { ...evidence, delayed: met("2026-09-04T12:00:00.000Z") },
    lastPracticedAt: "2026-09-01T12:00:00.000Z",
  }), now).state, "mastered");
});

test("a future delayed completion is not legitimate mastery evidence", () => {
  const now = new Date("2026-09-05T00:00:00.000Z");
  const result = evaluateAdaptiveMastery(concept({
    evidence: {
      practice: met("2026-09-01T00:00:00.000Z"),
      variant: met(),
      transfer: met(),
      delayed: met("2026-09-06T00:00:00.000Z"),
    },
    lastPracticedAt: "2026-09-01T00:00:00.000Z",
    nextReviewAt: "2026-09-06T00:00:00.000Z",
  }), now);

  assert.equal(result.state, "practiced");
});

test("an open misconception prevents mastery and does not create a stale risk", () => {
  const result = evaluateAdaptiveMastery(concept({
    evidence: {
      practice: met("2026-07-01T00:00:00.000Z"),
      variant: met("2026-07-01T00:00:00.000Z"),
      transfer: met("2026-07-01T00:00:00.000Z"),
      delayed: met("2026-07-04T00:00:00.000Z"),
    },
    retryCount: 2,
    totalHints: 1,
    unresolvedMisconceptions: 1,
    lastPracticedAt: "2026-07-01T00:00:00.000Z",
    nextReviewAt: "2026-07-04T00:00:00.000Z",
    blockedOutgoingEdgeIds: ["vectors-to-transform"],
  }), new Date("2026-09-05T00:00:00.000Z"));

  assert.equal(result.state, "review_due");
  assert.deepEqual(result.risks, [
    "hint_dependent",
    "retry_heavy",
    "misconception_open",
    "prerequisite_blocked",
  ]);
});

test("risks use retry count, both prerequisite signals, and declared order", () => {
  const now = new Date("2026-09-05T00:00:00.000Z");
  const completed = {
    practice: met("2026-08-01T00:00:00.000Z"),
    variant: met("2026-08-01T00:00:00.000Z"),
    transfer: met("2026-08-01T00:00:00.000Z"),
    delayed: met("2026-08-04T00:00:00.000Z"),
  };
  const normalCompletion = evaluateAdaptiveMastery(concept({
    evidence: completed,
    totalAttempts: 5,
    retryCount: 0,
  }), now);

  assert.deepEqual(normalCompletion.risks, ["stale"]);

  const result = evaluateAdaptiveMastery(concept({
    evidence: completed,
    totalAttempts: 5,
    retryCount: 2,
    totalHints: 1,
    blockedOutgoingEdgeIds: ["vectors-to-transform", "vectors-to-transform"],
  }), now);

  assert.equal(result.state, "mastered");
  assert.deepEqual(result.risks, ["hint_dependent", "retry_heavy", "stale", "prerequisite_blocked"]);

  const lockedOnly = evaluateAdaptiveMastery(concept({ unlocked: false }), now);
  assert.deepEqual(lockedOnly.risks, ["prerequisite_blocked"]);
});

test("stale begins only after 21 full days and only for mastered evidence", () => {
  const now = new Date("2026-09-05T00:00:00.000Z");
  const masteryEvidence = (delayedAt) => ({
    practice: met("2026-08-11T00:00:00.000Z"),
    variant: met("2026-08-11T00:00:00.000Z"),
    transfer: met("2026-08-11T00:00:00.000Z"),
    delayed: met(delayedAt),
  });

  assert.deepEqual(evaluateAdaptiveMastery(concept({
    evidence: masteryEvidence("2026-08-15T00:00:00.000Z"),
  }), now).risks, []);
  assert.deepEqual(evaluateAdaptiveMastery(concept({
    evidence: masteryEvidence("2026-08-14T23:59:59.999Z"),
  }), now).risks, ["stale"]);
});

test("evaluation returns the concept fields without mutating the snapshot", () => {
  const input = concept({ retryCount: 2, totalHints: 1 });
  const before = structuredClone(input);

  const result = evaluateAdaptiveMastery(input, new Date("2026-09-05T00:00:00.000Z"));

  assert.deepEqual(input, before);
  assert.equal(result.id, input.id);
  assert.equal(result.state, "unexplored");
  assert.deepEqual(result.risks, ["hint_dependent", "retry_heavy"]);
});
