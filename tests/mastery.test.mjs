import assert from "node:assert/strict";
import test from "node:test";

import { nextMasteryState } from "../lib/mastery.mjs";

const completeEvidence = {
  attempted: true,
  standardCorrect: true,
  hintLevel: 0,
  variantCorrect: true,
  transferCorrect: true,
  delayedCorrect: true,
  delayHours: 72,
};

test("rejects unknown mastery states", () => {
  assert.throws(
    () => nextMasteryState("complete", completeEvidence),
    /Unknown mastery state/,
  );
});

test("moves an attempted concept into learning", () => {
  assert.equal(nextMasteryState("unseen", { attempted: true }), "learning");
});

test("marks independent standard and variant work as practiced", () => {
  assert.equal(
    nextMasteryState("learning", {
      attempted: true,
      standardCorrect: true,
      hintLevel: 0,
      variantCorrect: true,
    }),
    "practiced",
  );
});

test("requires independent, transfer, and delayed evidence for mastery", () => {
  assert.equal(nextMasteryState("practiced", completeEvidence), "mastered");
  assert.equal(
    nextMasteryState("practiced", { ...completeEvidence, delayHours: 71 }),
    "practiced",
  );
  assert.equal(
    nextMasteryState("practiced", { ...completeEvidence, hintLevel: 1 }),
    "learning",
  );
});

test("routes critical misconceptions and failed delayed checks to review", () => {
  assert.equal(
    nextMasteryState("learning", { attempted: true, criticalMisconception: true }),
    "needs_review",
  );
  assert.equal(
    nextMasteryState("mastered", { delayedCorrect: false }),
    "needs_review",
  );
});
