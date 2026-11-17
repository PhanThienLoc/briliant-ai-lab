import assert from "node:assert/strict";
import test from "node:test";
import { getExpansionLab, prerequisiteEdges } from "../lib/expansion-catalog.ts";
import { completeExpansionLab, EXPANSION_REVIEW_DELAY_MS, isExpansionLabUnlocked, normalizeExpansionProgress, submitExpansionReview, submitPrerequisiteEdge } from "../lib/expansion-progress.ts";

const startedAt = Date.parse("2026-08-29T00:00:00.000Z");

test("prerequisite edges unlock only from real practice evidence", () => {
  const empty = normalizeExpansionProgress(null, startedAt);
  assert.equal(isExpansionLabUnlocked(empty, "logic-truth-table"), true);
  assert.equal(isExpansionLabUnlocked(empty, "probability-conditional"), false);
  assert.equal(isExpansionLabUnlocked(empty, "linear-vectors"), true);
  assert.equal(isExpansionLabUnlocked(empty, "linear-transform"), false);
  assert.equal(completeExpansionLab(empty, "probability-conditional", startedAt), empty);

  const afterLogic = completeExpansionLab(empty, "logic-truth-table", startedAt);
  assert.equal(isExpansionLabUnlocked(afterLogic, "probability-conditional"), false);
  const wrongBridge = submitPrerequisiteEdge(afterLogic, "logic-to-conditional", 0);
  assert.equal(wrongBridge.passed, false);
  assert.equal(isExpansionLabUnlocked(wrongBridge.progress, "probability-conditional"), false);
  const passedBridge = submitPrerequisiteEdge(wrongBridge.progress, "logic-to-conditional", 1);
  assert.equal(passedBridge.passed, true);
  assert.equal(isExpansionLabUnlocked(passedBridge.progress, "probability-conditional"), true);
  assert.equal(Date.parse(afterLogic.reviews["logic-truth-table"].dueAt), startedAt + EXPANSION_REVIEW_DELAY_MS);
});

test("every prerequisite edge has an independent transfer gate", () => {
  for (const edge of prerequisiteEdges) {
    const prerequisites = getExpansionLab(edge.to).prerequisites;
    const otherPassedEdges = prerequisiteEdges.filter((candidate) => candidate.to === edge.to && candidate.id !== edge.id).map((candidate) => candidate.id);
    const sourceEvidence = normalizeExpansionProgress({ completedLabIds: prerequisites, passedEdgeIds: otherPassedEdges }, startedAt);
    assert.equal(isExpansionLabUnlocked(sourceEvidence, edge.to), false, edge.id);
    const passed = submitPrerequisiteEdge(sourceEvidence, edge.id, edge.answerIndex);
    assert.equal(passed.passed, true, edge.id);
    assert.equal(isExpansionLabUnlocked(passed.progress, edge.to), true, edge.id);
  }
});

test("legacy R1/R2 evidence migrates and receives a delayed review schedule", () => {
  const migrated = normalizeExpansionProgress({ completedLabIds: ["logic-truth-table"], attempts: { "logic-truth-table": 2 } }, startedAt);
  assert.deepEqual(migrated.completedLabIds, ["logic-truth-table"]);
  assert.equal(migrated.attempts["logic-truth-table"], 2);
  assert.deepEqual(migrated.passedEdgeIds, []);
  assert.equal(Date.parse(migrated.reviews["logic-truth-table"].dueAt), startedAt + EXPANSION_REVIEW_DELAY_MS);
});

test("mastery cannot bypass the 72-hour delayed transfer", () => {
  const practiced = completeExpansionLab(normalizeExpansionProgress(null, startedAt), "logic-truth-table", startedAt);
  const early = submitExpansionReview(practiced, "logic-truth-table", 1, startedAt + EXPANSION_REVIEW_DELAY_MS - 1);
  assert.equal(early.reason, "not_due");
  assert.equal(early.progress.reviews["logic-truth-table"].passedAt, undefined);

  const wrong = submitExpansionReview(practiced, "logic-truth-table", 0, startedAt + EXPANSION_REVIEW_DELAY_MS);
  assert.equal(wrong.reason, "incorrect");
  assert.equal(wrong.progress.reviews["logic-truth-table"].attempts, 1);

  const passed = submitExpansionReview(wrong.progress, "logic-truth-table", 1, startedAt + EXPANSION_REVIEW_DELAY_MS + 1);
  assert.equal(passed.reason, "passed");
  assert.ok(passed.progress.reviews["logic-truth-table"].passedAt);
});
