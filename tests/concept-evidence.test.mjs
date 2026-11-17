import assert from "node:assert/strict";
import test from "node:test";
import { projectConceptEvidence } from "../lib/concept-evidence.ts";
import { createMemoryLearningRepository } from "../lib/learning-repository.ts";
import { emptyExpansionProgress } from "../lib/expansion-progress.ts";

const now = new Date("2026-09-05T00:00:00.000Z");

function baseSnapshot(overrides = {}) {
  return {
    lessons: {},
    expansion: emptyExpansionProgress,
    diagnostic: null,
    repairs: [],
    history: [],
    adaptive: { schemaVersion: 1, sessionMinutes: 30, lastGeneratedAt: null, lastQueueIds: [] },
    warnings: [],
    ...overrides,
  };
}

test("R0 evidence maps five activities into practice, variant, transfer and delayed gates", async () => {
  const progress = {
    currentIndex: 5,
    completed: ["frame-predict", "frame-mechanism", "frame-explain", "frame-code", "frame-transfer"],
    attempts: { "frame-predict": 1, "frame-mechanism": 1, "frame-explain": 2, "frame-code": 1, "frame-transfer": 1 },
    hintLevels: { "frame-explain": 1 },
    activityEvidence: {
      "frame-predict": { completedAt: now.toISOString(), attempts: 1, hintsUsed: 0 },
      "frame-mechanism": { completedAt: now.toISOString(), attempts: 1, hintsUsed: 0 },
      "frame-explain": { completedAt: now.toISOString(), attempts: 2, hintsUsed: 1 },
      "frame-code": { completedAt: now.toISOString(), attempts: 1, hintsUsed: 0 },
      "frame-transfer": { completedAt: now.toISOString(), attempts: 1, hintsUsed: 0 },
    },
    practicedAt: now.toISOString(),
    review: { dueAt: now.toISOString(), completedAt: now.toISOString(), attempts: 1, correct: true },
  };
  const repo = createMemoryLearningRepository(baseSnapshot({ lessons: { "problem-frame": progress } }));
  const concepts = projectConceptEvidence(await repo.readSnapshot(now), now);
  const concept = concepts.find((item) => item.id === "problem-frame");

  assert.equal(concept.evidence.practice.status, "met");
  assert.equal(concept.evidence.variant.status, "met");
  assert.equal(concept.evidence.transfer.status, "met");
  assert.equal(concept.evidence.delayed.status, "met");
  assert.equal(concept.totalHints, 1);
  assert.equal(concept.totalAttempts, 6);
  assert.equal(concept.retryCount, 1);
  assert.equal(concept.unlocked, true);
});

test("R0 gates require every assigned activity and preserve legacy evidence", () => {
  const completedAt = "2026-09-01T00:00:00.000Z";
  const snapshot = baseSnapshot({
    lessons: {
      "problem-frame": {
        currentIndex: 4,
        completed: ["frame-predict", "frame-explain", "frame-code", "frame-transfer"],
        attempts: { "frame-predict": 2, "frame-mechanism": 3, "frame-explain": 1, "frame-code": 1, "frame-transfer": 1 },
        hintLevels: { "frame-predict": 2, "frame-mechanism": 1 },
        activityEvidence: {
          "frame-predict": { completedAt, attempts: 4, hintsUsed: 3 },
        },
        practicedAt: completedAt,
        review: { dueAt: "2026-09-04T00:00:00.000Z", completedAt, attempts: 2, correct: false },
      },
    },
    repairs: [
      { lessonId: "problem-frame" },
      { lessonId: "problem-frame" },
      { lessonId: "vectors" },
    ],
  });

  const concept = projectConceptEvidence(snapshot, now).find((item) => item.id === "problem-frame");

  assert.deepEqual(concept.evidence.practice, {
    status: "missing",
    completedAt: null,
    attempts: 7,
    hintsUsed: 4,
  });
  assert.equal(concept.evidence.variant.status, "met");
  assert.equal(concept.evidence.transfer.status, "met");
  assert.equal(concept.evidence.delayed.status, "missing");
  assert.equal(concept.totalAttempts, 10);
  assert.equal(concept.totalHints, 4);
  assert.equal(concept.retryCount, 5);
  assert.equal(concept.unresolvedMisconceptions, 2);
  assert.equal(concept.lastPracticedAt, completedAt);
  assert.equal(concept.nextReviewAt, "2026-09-04T00:00:00.000Z");
});

test("expansion projection requires independent practice and reports blocked outgoing edges separately", () => {
  const snapshot = baseSnapshot({
    expansion: {
      ...emptyExpansionProgress,
      completedLabIds: ["logic-truth-table"],
      hintedLabIds: ["logic-truth-table"],
      attempts: { "logic-truth-table": 3 },
      completedAt: { "logic-truth-table": "2026-09-01T00:00:00.000Z" },
      reviews: { "logic-truth-table": { dueAt: "2026-09-04T00:00:00.000Z", attempts: 1, passedAt: "2026-09-04T00:00:00.000Z" } },
    },
  });
  const concepts = projectConceptEvidence(snapshot, now);
  const logic = concepts.find((item) => item.id === "logic-truth-table");
  const conditional = concepts.find((item) => item.id === "probability-conditional");

  assert.equal(logic.evidence.practice.status, "missing");
  assert.equal(logic.evidence.variant.status, "not_applicable");
  assert.equal(logic.evidence.transfer.status, "not_applicable");
  assert.equal(logic.evidence.delayed.status, "met");
  assert.equal(logic.totalAttempts, 3);
  assert.equal(logic.totalHints, 1);
  assert.equal(logic.retryCount, 2);
  assert.equal(logic.unlocked, true);
  assert.equal(conditional.unlocked, false);
  assert.deepEqual(logic.blockedOutgoingEdgeIds, ["logic-to-conditional"]);
});

test("expansion unlocks follow prerequisite edge evidence and projection is pure", () => {
  const snapshot = baseSnapshot({
    expansion: {
      ...emptyExpansionProgress,
      completedLabIds: ["logic-truth-table"],
      attempts: { "logic-truth-table": 1 },
      completedAt: { "logic-truth-table": "2026-09-01T00:00:00.000Z" },
      reviews: { "logic-truth-table": { dueAt: "2026-09-04T00:00:00.000Z", attempts: 0 } },
      passedEdgeIds: ["logic-to-conditional"],
      edgeAttempts: { "logic-to-conditional": 2 },
    },
  });
  const before = structuredClone(snapshot);

  const concepts = projectConceptEvidence(snapshot, now);
  const logic = concepts.find((item) => item.id === "logic-truth-table");
  const conditional = concepts.find((item) => item.id === "probability-conditional");

  assert.equal(conditional.unlocked, true);
  assert.deepEqual(logic.blockedOutgoingEdgeIds, []);
  assert.deepEqual(snapshot, before);
  assert.equal(concepts[0].id, "problem-frame");
  assert.equal(concepts[13].id, "capstone");
  assert.equal(concepts[14].id, "logic-truth-table");
  assert.equal(concepts.at(-1).id, "ai-evaluation");
});
