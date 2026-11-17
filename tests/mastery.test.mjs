import assert from "node:assert/strict";
import test from "node:test";
import {
  activityEvidenceScore,
  initialLessonProgress,
  lessonEvidenceScore,
  lessonEvidenceSummary,
  masteryState,
  normalizeProgress,
  reviewDueAt,
  recordLessonAttempt,
} from "../lib/mastery-engine.ts";

for (const [currentIndex, expected] of [[0.5, 0], [3.9, 3], [-1, 0], [99, 4], ["2", 0], [null, 0], [NaN, 0], [Infinity, 0]]) {
  test(`local activity index ${String(currentIndex)} normalizes to a safe activity`, () => {
    const normalized = normalizeProgress({ currentIndex }, 5);
    assert.equal(normalized.currentIndex, expected);
    assert.ok(["a", "b", "c", "d", "e"][normalized.currentIndex]);
  });
}

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

const activityIds = ["a", "b", "c", "d", "e"];
const now = new Date("2026-11-16T00:00:00.000Z");

test("duplicates cannot complete a lesson or inflate evidence through raw consumers", () => {
  const raw = { ...initialLessonProgress, completed: Array(10).fill("a"), practicedAt: now.toISOString() };
  assert.equal(lessonEvidenceScore(raw, 5), 20);
  assert.equal(masteryState(raw, 5, now), "practicing");
  const normalized = normalizeProgress({ completed: raw.completed }, 5, now);
  assert.deepEqual(normalized.completed, ["a"]);
  assert.equal(normalized.practicedAt, null);
  const attempted = recordLessonAttempt({ ...raw, practicedAt: null }, "b", true, 5, 0, now);
  assert.deepEqual(attempted.completed, ["a", "b"]);
  assert.equal(attempted.practicedAt, null);
});

test("known catalog IDs reject unknown completion evidence even when count looks complete", () => {
  const raw = { ...initialLessonProgress, completed: ["a", "b", "c", "d", "unknown"], practicedAt: now.toISOString(), review: { dueAt: now.toISOString(), completedAt: now.toISOString(), correct: true, attempts: 1 } };
  assert.equal(lessonEvidenceScore(raw, 5, activityIds), 80);
  assert.equal(masteryState(raw, 5, now, activityIds), "practicing");
  const normalized = normalizeProgress(raw, 5, now, activityIds);
  assert.deepEqual(normalized.completed, activityIds.slice(0, 4));
  assert.equal(normalized.practicedAt, raw.practicedAt);
  assert.deepEqual(normalized.review, raw.review);
  const next = recordLessonAttempt(raw, "e", true, 5, 0, now, activityIds);
  assert.deepEqual(next.completed, activityIds);
  assert.equal(masteryState(next, 5, now, activityIds), "mastered");
  assert.deepEqual(recordLessonAttempt(raw, "unknown", true, 5, 0, now, activityIds).completed, activityIds.slice(0, 4));
});

test("legitimate legacy catalog progress keeps evidence and review timestamps", () => {
  const raw = { ...initialLessonProgress, completed: [...activityIds, "a"], attempts: { a: 2 }, hintLevels: { a: 1 }, practicedAt: "2026-11-10T00:00:00.000Z", review: { dueAt: "2026-11-13T00:00:00.000Z", completedAt: "2026-11-14T00:00:00.000Z", correct: true, attempts: 1 } };
  const normalized = normalizeProgress(raw, 5, now, activityIds);
  assert.deepEqual(normalized, { ...raw, completed: activityIds });
  assert.equal(masteryState(normalized, 5, now, activityIds), "mastered");
  assert.equal(lessonEvidenceScore(normalized, 5, activityIds), 94);
  assert.equal(normalizeProgress({ completed: activityIds }, 5, now, activityIds).practicedAt, now.toISOString());
});

test("evidence stays finite and bounded for noisy numeric values and excess completions", () => {
  for (const [attempts, hints] of [[1,-5],[Infinity,0],[1,NaN],[1,-Infinity],[-1,0]]) {
    const score = activityEvidenceScore(attempts, hints);
    assert.ok(Number.isFinite(score) && score >= 0 && score <= 100);
  }
  assert.equal(lessonEvidenceScore({ ...initialLessonProgress, completed: ["a","b","c"] }, 1), 100);
  assert.equal(normalizeProgress({ completed: [] }, 0, now).practicedAt, null);
});

test("dashboard evidence summary excludes foreign and uncompleted metadata without deleting it", () => {
  const foreign = Object.fromEntries(Array.from({ length: 71 }, (_, index) => [`foreign-${index}`, { completedAt: now.toISOString(), attempts: 1, hintsUsed: 0 }]));
  const raw = { ...initialLessonProgress, completed: Object.keys(foreign), activityEvidence: foreign, attempts: Object.fromEntries(Object.keys(foreign).map((id) => [id, 1])) };
  const progress = normalizeProgress(raw, 5, now, activityIds);
  assert.deepEqual(lessonEvidenceSummary(progress, activityIds), { completed: 0, independent: 0, assisted: 0, firstAttemptIndependent: 0, attempts: 0 });
  assert.equal(Object.keys(progress.activityEvidence).length, 71);
  const mixed = { ...progress, completed: ["a", "a", "b", "foreign-0"], activityEvidence: { ...foreign, a: { completedAt: now.toISOString(), attempts: 1, hintsUsed: 0 }, b: { completedAt: now.toISOString(), attempts: 2, hintsUsed: 1 }, c: { completedAt: now.toISOString(), attempts: 1, hintsUsed: 0 } }, attempts: { ...raw.attempts, a: 1, b: 2, c: 3 } };
  assert.deepEqual(lessonEvidenceSummary(mixed, activityIds), { completed: 2, independent: 1, assisted: 1, firstAttemptIndependent: 1, attempts: 6 });
});

test("dashboard evidence summary falls back to legitimate legacy attempts and hints", () => {
  const legacy = { ...initialLessonProgress, completed: ["a", "b", "c"], attempts: { b: 2, d: 1 }, hintLevels: { b: 1, c: 0 } };
  assert.deepEqual(lessonEvidenceSummary(legacy, activityIds), { completed: 3, independent: 2, assisted: 1, firstAttemptIndependent: 2, attempts: 5 });
});
