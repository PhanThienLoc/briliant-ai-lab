import assert from "node:assert/strict";
import test from "node:test";
import {
  activityEvidenceScore,
  initialLessonProgress,
  lessonEvidenceScore,
  masteryState,
  normalizeProgress,
  reviewDueAt,
} from "../lib/mastery-engine.ts";

test("evidence scoring penalizes retries and hints without erasing completion", () => {
  assert.equal(activityEvidenceScore(1, 0), 100);
  assert.equal(activityEvidenceScore(2, 0), 88);
  assert.equal(activityEvidenceScore(1, 1), 82);
  assert.equal(activityEvidenceScore(9, 2), 35);
});

test("mastery requires complete practice and delayed independent review", () => {
  const practicedAt = "2026-08-20T00:00:00.000Z";
  const dueAt = reviewDueAt(practicedAt);
  const progress = {
    ...initialLessonProgress,
    completed: ["a", "b", "c", "d", "e"],
    practicedAt,
    activityEvidence: {
      a: { completedAt: practicedAt, attempts: 1, hintsUsed: 0 },
      b: { completedAt: practicedAt, attempts: 1, hintsUsed: 0 },
      c: { completedAt: practicedAt, attempts: 2, hintsUsed: 0 },
      d: { completedAt: practicedAt, attempts: 1, hintsUsed: 1 },
      e: { completedAt: practicedAt, attempts: 1, hintsUsed: 0 },
    },
    review: { dueAt, completedAt: null, attempts: 0, correct: false },
  };

  assert.equal(masteryState(progress, 5, new Date("2026-08-22T23:00:00.000Z")), "practiced");
  assert.equal(masteryState(progress, 5, new Date("2026-08-23T00:00:00.000Z")), "review_due");
  assert.equal(lessonEvidenceScore(progress, 5), 94);

  const mastered = { ...progress, review: { dueAt, completedAt: dueAt, attempts: 1, correct: true } };
  assert.equal(masteryState(mastered, 5, new Date("2026-08-23T00:00:01.000Z")), "mastered");
});

test("legacy progress is preserved and scheduled instead of discarded", () => {
  const legacy = { currentIndex: 4, completed: ["a", "b", "c", "d", "e"], attempts: {}, hintLevels: {} };
  const migrated = normalizeProgress(legacy, 5, new Date("2026-08-26T00:00:00.000Z"));
  assert.equal(migrated.completed.length, 5);
  assert.equal(migrated.practicedAt, "2026-08-26T00:00:00.000Z");
  assert.equal(masteryState(migrated, 5, new Date("2026-08-26T00:00:00.000Z")), "practiced");
});
