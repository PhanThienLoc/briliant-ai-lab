import assert from "node:assert/strict";
import test from "node:test";
import {
  ADAPTIVE_STATE_KEY,
  createLocalStorageLearningRepository,
  createMemoryLearningRepository,
  normalizeAdaptiveState,
} from "../lib/learning-repository.ts";

class MemoryStorage {
  constructor(entries = {}, failOnSet = null) {
    this.values = new Map(Object.entries(entries));
    this.failOnSet = failOnSet;
  }

  get length() { return this.values.size; }
  key(index) { return [...this.values.keys()][index] ?? null; }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) {
    if (key === this.failOnSet) throw new Error("quota");
    this.values.set(key, String(value));
  }
  removeItem(key) { this.values.delete(key); }
}

const diagnosticAnswers = {
  "frame-target": 1,
  "frame-metric": 1,
  "data-role": 2,
  "data-leak": 2,
  "math-dot": 1,
  "math-derivative": 1,
  "opt-direction": 1,
  "opt-rate": 0,
  "validation-role": 1,
  "validation-gap": 1,
};

const healthyExpansion = JSON.stringify({ completedLabIds: ["logic-truth-table"] });

for (const [currentIndex, expected] of [[0.5, 0], [-1, 0], [99, 4]]) {
  test(`repository clamps local index ${currentIndex} while preserving learning evidence and bytes`, async () => {
    const key = "briliantai.lesson.vectors.progress.v3";
    const progress = {
      currentIndex, completed: ["vec-predict"], attempts: { "vec-predict": 2 }, hintLevels: { "vec-predict": 1 },
      activityEvidence: { "vec-predict": { completedAt: "2026-08-28T00:00:00.000Z", independentAt: "2026-08-29T00:00:00.000Z", attempts: 2, hintsUsed: 1 } },
      practicedAt: "2026-08-28T00:00:00.000Z", review: { dueAt: "2026-08-31T00:00:00.000Z", completedAt: null, attempts: 0, correct: false },
    };
    const bytes = JSON.stringify(progress);
    const storage = new MemoryStorage({ [key]: bytes });
    const snapshot = await createLocalStorageLearningRepository(storage).readSnapshot();
    assert.deepEqual(snapshot.lessons.vectors, { ...progress, currentIndex: expected });
    assert.deepEqual(snapshot.warnings, []);
    assert.equal(storage.getItem(key), bytes);
  });
}

test("repository reads valid legacy learning state without deleting it", async () => {
  const legacyLessonKey = "briliantai.lesson.vectors.progress.v2";
  const legacyExpansionKey = "briliantai.expansion-progress.v2";
  const storage = new MemoryStorage({
    [legacyLessonKey]: JSON.stringify({ completed: ["vec-predict"] }),
    [legacyExpansionKey]: healthyExpansion,
  });

  const snapshot = await createLocalStorageLearningRepository(storage)
    .readSnapshot(new Date("2026-09-05T00:00:00.000Z"));

  assert.deepEqual(snapshot.lessons.vectors.completed, ["vec-predict"]);
  assert.deepEqual(snapshot.expansion.completedLabIds, ["logic-truth-table"]);
  assert.deepEqual(snapshot.warnings, []);
  assert.equal(storage.getItem(legacyLessonKey) !== null, true);
  assert.equal(storage.getItem(legacyExpansionKey) !== null, true);
});

test("current lesson and expansion state takes precedence over legacy state", async () => {
  const storage = new MemoryStorage({
    "briliantai.lesson.vectors.progress.v3": JSON.stringify({ completed: ["vec-predict"] }),
    "briliantai.lesson.vectors.progress.v2": JSON.stringify({ completed: ["vec-explain"] }),
    "briliantai.expansion-progress.v3": JSON.stringify({ completedLabIds: ["sql-select"] }),
    "briliantai.expansion-progress.v2": healthyExpansion,
  });

  const snapshot = await createLocalStorageLearningRepository(storage).readSnapshot();

  assert.deepEqual(snapshot.lessons.vectors.completed, ["vec-predict"]);
  assert.deepEqual(snapshot.expansion.completedLabIds, ["sql-select"]);
});

test("corrupt domains are isolated as warnings and storage remains unchanged", async () => {
  const lessonKey = "briliantai.lesson.vectors.progress.v3";
  const diagnosticKey = "briliantai.diagnostic.v1";
  const entries = {
    [lessonKey]: "{broken",
    [diagnosticKey]: JSON.stringify({ invalid: true }),
    "briliantai.expansion-progress.v3": healthyExpansion,
  };
  const storage = new MemoryStorage(entries);

  const snapshot = await createLocalStorageLearningRepository(storage).readSnapshot();

  assert.equal(snapshot.lessons.vectors.completed.length, 0);
  assert.deepEqual(snapshot.expansion.completedLabIds, ["logic-truth-table"]);
  assert.deepEqual(snapshot.warnings.map(({ domain, code }) => ({ domain, code })).sort((a, b) => a.domain.localeCompare(b.domain)), [
    { domain: "diagnostic", code: "invalid_shape" },
    { domain: "lesson:vectors", code: "invalid_json" },
  ]);
  assert.equal(storage.getItem(lessonKey), entries[lessonKey]);
  assert.equal(storage.getItem(diagnosticKey), entries[diagnosticKey]);
});

test("invalid supplied nested fields corrupt only their own domain", async (t) => {
  const poison = { toString: null };
  const scenarios = [
    ["lesson attempts string", "lesson:vectors", { "briliantai.lesson.vectors.progress.v3": JSON.stringify({ attempts: "2" }) }],
    ["lesson attempts coercion poison", "lesson:vectors", { "briliantai.lesson.vectors.progress.v3": JSON.stringify({ attempts: { activity: poison } }) }],
    ["lesson activity evidence boolean", "lesson:vectors", { "briliantai.lesson.vectors.progress.v3": JSON.stringify({ activityEvidence: { activity: true } }) }],
    ["lesson invalid timestamp", "lesson:vectors", { "briliantai.lesson.vectors.progress.v3": JSON.stringify({ practicedAt: "not-a-date" }) }],
    ["expansion completed ids string", "expansion", { "briliantai.expansion-progress.v3": JSON.stringify({ completedLabIds: "logic-truth-table" }) }],
    ["expansion attempts coercion poison", "expansion", { "briliantai.expansion-progress.v3": JSON.stringify({ attempts: { "logic-truth-table": poison } }) }],
    ["diagnostic answers array", "diagnostic", { "briliantai.diagnostic.v1": JSON.stringify({ answers: [], completedAt: "2026-09-05T00:00:00.000Z" }) }],
    ["diagnostic invalid timestamp", "diagnostic", { "briliantai.diagnostic.v1": JSON.stringify({ answers: diagnosticAnswers, completedAt: "not-a-date" }) }],
    ["adaptive minutes string", "adaptive", { [ADAPTIVE_STATE_KEY]: JSON.stringify({ sessionMinutes: "30" }) }],
    ["adaptive queue object", "adaptive", { [ADAPTIVE_STATE_KEY]: JSON.stringify({ lastQueueIds: { first: "a" } }) }],
    ["repair attempts coercion poison", "repairs", { "briliantai.repair-queue.v1": JSON.stringify([{ attempts: poison }]) }],
    ["history duration coercion poison", "history", { "briliantai.learning-log.v1": JSON.stringify([{ durationMs: poison }]) }],
  ];

  for (const [name, domain, corruptEntry] of scenarios) {
    await t.test(name, async () => {
      const storage = new MemoryStorage({
        "briliantai.expansion-progress.v2": healthyExpansion,
        ...corruptEntry,
      });
      const snapshot = await createLocalStorageLearningRepository(storage).readSnapshot();
      assert.deepEqual(snapshot.warnings.map(({ domain: warningDomain, code }) => ({ domain: warningDomain, code })), [
        { domain, code: "invalid_shape" },
      ]);
      if (domain !== "expansion") {
        assert.deepEqual(snapshot.expansion.completedLabIds, ["logic-truth-table"]);
      }
    });
  }
});

test("missing legacy fields normalize without invalid-shape warnings", async () => {
  const storage = new MemoryStorage({
    "briliantai.lesson.vectors.progress.v2": JSON.stringify({ currentIndex: 1, completed: ["vec-predict"], attempts: {}, hintLevels: {} }),
    "briliantai.expansion-progress.v1": JSON.stringify({ completedLabIds: ["logic-truth-table"], attempts: { "logic-truth-table": 2 } }),
  });

  const snapshot = await createLocalStorageLearningRepository(storage)
    .readSnapshot(new Date("2026-09-05T00:00:00.000Z"));

  assert.deepEqual(snapshot.warnings, []);
  assert.equal(snapshot.lessons.vectors.activityEvidence["vec-predict"], undefined);
  assert.equal(snapshot.expansion.attempts["logic-truth-table"], 2);
});

test("valid diagnostic, repair, history, and adaptive metadata is normalized", async () => {
  const repair = {
    id: "vectors:vec-predict",
    lessonId: "vectors",
    activityId: "vec-predict",
    lessonTitle: "Vectors",
    activityLabel: "Predict",
    reason: "too_short",
    title: "Repair",
    prompt: "Explain the link.",
    attempts: 2,
    hintLevel: 1,
    disputed: false,
    updatedAt: "2026-09-05T00:00:00.000Z",
    rawLearnerText: "must not escape the storage boundary",
  };
  const history = {
    id: "event-1",
    eventType: "activity_attempt",
    lessonId: "vectors",
    activityId: "vec-predict",
    outcome: "pass",
    hintLevel: 1,
    durationMs: 1250,
    errorCode: "none",
    occurredAt: "2026-09-05T00:01:00.000Z",
    rawLearnerText: "must not escape the storage boundary",
  };
  const storage = new MemoryStorage({
    "briliantai.diagnostic.v1": JSON.stringify({ answers: diagnosticAnswers, completedAt: "2026-09-05T00:00:00.000Z" }),
    "briliantai.repair-queue.v1": JSON.stringify([repair]),
    "briliantai.learning-log.v1": JSON.stringify([history]),
    [ADAPTIVE_STATE_KEY]: JSON.stringify({ sessionMinutes: 25, lastGeneratedAt: "2026-09-05T00:02:00.000Z", lastQueueIds: ["a", "a", "b", "c", "d", "e"] }),
  });

  const snapshot = await createLocalStorageLearningRepository(storage).readSnapshot();

  assert.equal(snapshot.diagnostic.score, 10);
  assert.deepEqual(snapshot.repairs, [{
    id: repair.id,
    lessonId: repair.lessonId,
    activityId: repair.activityId,
    lessonTitle: repair.lessonTitle,
    activityLabel: repair.activityLabel,
    reason: repair.reason,
    title: repair.title,
    prompt: repair.prompt,
    attempts: 2,
    hintLevel: 1,
    disputed: false,
    updatedAt: repair.updatedAt,
  }]);
  assert.deepEqual(snapshot.history, [{
    id: history.id,
    eventType: history.eventType,
    lessonId: history.lessonId,
    activityId: history.activityId,
    outcome: history.outcome,
    hintLevel: 1,
    durationMs: 1250,
    errorCode: history.errorCode,
    occurredAt: history.occurredAt,
  }]);
  assert.deepEqual(snapshot.adaptive, {
    schemaVersion: 1,
    sessionMinutes: 25,
    lastGeneratedAt: "2026-09-05T00:02:00.000Z",
    lastQueueIds: ["a", "b", "c", "d"],
  });
});

test("repair and history metadata arrays are bounded", async () => {
  const repairs = Array.from({ length: 55 }, (_, index) => ({
    id: `repair-${index}`,
    lessonId: "vectors",
    activityId: `activity-${index}`,
    lessonTitle: "Vectors",
    activityLabel: "Activity",
    reason: "too_short",
    title: "Repair",
    prompt: "Explain.",
    attempts: 1,
    hintLevel: 0,
    disputed: false,
    updatedAt: "2026-09-05T00:00:00.000Z",
  }));
  const history = Array.from({ length: 405 }, (_, index) => ({
    id: `event-${index}`,
    eventType: "activity_attempt",
    occurredAt: "2026-09-05T00:00:00.000Z",
  }));
  const snapshot = await createLocalStorageLearningRepository(new MemoryStorage({
    "briliantai.repair-queue.v1": JSON.stringify(repairs),
    "briliantai.learning-log.v1": JSON.stringify(history),
  })).readSnapshot();

  assert.equal(snapshot.repairs.length, 50);
  assert.equal(snapshot.repairs[0].id, "repair-5");
  assert.equal(snapshot.history.length, 400);
  assert.equal(snapshot.history[0].id, "event-5");
});

test("adaptive preferences are bounded and storage failures are recoverable", async () => {
  assert.deepEqual(normalizeAdaptiveState({ sessionMinutes: 500, lastQueueIds: ["a", 2, "a", "b", "c", "d", "e"] }), {
    schemaVersion: 1,
    sessionMinutes: 60,
    lastGeneratedAt: null,
    lastQueueIds: ["a", "b", "c", "d"],
  });
  assert.deepEqual(normalizeAdaptiveState({ sessionMinutes: 1, lastGeneratedAt: "not-a-date" }), {
    schemaVersion: 1,
    sessionMinutes: 15,
    lastGeneratedAt: null,
    lastQueueIds: [],
  });
  assert.deepEqual(normalizeAdaptiveState({ sessionMinutes: { toString: null } }), {
    schemaVersion: 1,
    sessionMinutes: 30,
    lastGeneratedAt: null,
    lastQueueIds: [],
  });

  const storage = new MemoryStorage({}, ADAPTIVE_STATE_KEY);
  const result = await createLocalStorageLearningRepository(storage)
    .writeAdaptiveState(normalizeAdaptiveState(null));
  assert.equal(result.ok, false);
  assert.equal(result.warning.domain, "adaptive");
  assert.equal(result.warning.code, "write_failed");
});

test("memory repository clones its input, reads, and adaptive writes", async () => {
  const source = await createLocalStorageLearningRepository(new MemoryStorage()).readSnapshot();
  source.adaptive.lastQueueIds.push("initial");
  const repository = createMemoryLearningRepository(source);

  source.adaptive.lastQueueIds.push("construction-mutation");
  const first = await repository.readSnapshot();
  assert.deepEqual(first.adaptive.lastQueueIds, ["initial"]);

  first.adaptive.lastQueueIds.push("read-mutation");
  assert.deepEqual((await repository.readSnapshot()).adaptive.lastQueueIds, ["initial"]);

  const nextAdaptive = normalizeAdaptiveState({ lastQueueIds: ["written"] });
  assert.deepEqual(await repository.writeAdaptiveState(nextAdaptive), { ok: true });
  nextAdaptive.lastQueueIds.push("write-mutation");
  const afterWrite = await repository.readSnapshot();
  assert.deepEqual(afterWrite.adaptive.lastQueueIds, ["written"]);
  assert.deepEqual(afterWrite.lessons, source.lessons);
});

test("repository filters duplicate and foreign IDs without changing stored bytes", async () => {
  const key = "briliantai.lesson.vectors.progress.v3";
  const bytes = JSON.stringify({ completed: [...Array(10).fill("vec-predict"), "foreign"] });
  const storage = new MemoryStorage({ [key]: bytes });
  const snapshot = await createLocalStorageLearningRepository(storage).readSnapshot();
  assert.deepEqual(snapshot.lessons.vectors.completed, ["vec-predict"]);
  assert.equal(snapshot.lessons.vectors.practicedAt, null);
  assert.equal(storage.getItem(key), bytes);
});
