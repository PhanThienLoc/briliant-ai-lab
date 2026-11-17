import assert from "node:assert/strict";
import test from "node:test";
import { buildTodayQueue } from "../lib/today-queue.ts";

const missing = () => ({ status: "missing", completedAt: null, attempts: 0, hintsUsed: 0 });
const met = (completedAt = "2026-09-01T00:00:00.000Z") => ({
  status: "met",
  completedAt,
  attempts: 1,
  hintsUsed: 0,
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
    state: "unexplored",
    risks: [],
    ...overrides,
  };
}

test("due review outranks novelty and explains the evidence", () => {
  const queue = buildTodayQueue({
    now: new Date("2026-09-05T00:00:00.000Z"),
    budgetMinutes: 30,
    concepts: [
      concept({ id: "probability-bayes", title: "Bayes", state: "review_due", nextReviewAt: "2026-09-03T00:00:00.000Z", totalHints: 2 }),
      concept({ id: "ml-threshold", title: "Threshold", state: "unexplored" }),
    ],
    repairs: [],
  });
  assert.equal(queue.items[0].type, "review");
  assert.equal(queue.items[0].target.id, "probability-bayes");
  assert.match(queue.items[0].reason, /quá hạn 2 ngày/);
  assert.match(queue.items[0].reason, /gợi ý/);
  assert.equal(queue.totalMinutes <= 30, true);
});

test("critical repair outranks non-due novelty", () => {
  const queue = buildTodayQueue({
    now: new Date("2026-09-05T00:00:00.000Z"),
    budgetMinutes: 30,
    concepts: [concept({ id: "vectors", state: "learning", unresolvedMisconceptions: 3 })],
    repairs: [{
      id: "vectors:vec-explain",
      lessonId: "vectors",
      activityId: "vec-explain",
      lessonTitle: "Vector và dot product",
      activityLabel: "Feynman explanation",
      reason: "unlinked_concepts",
      title: "Nối cơ chế",
      prompt: "Giải thích vì sao",
      attempts: 3,
      hintLevel: 2,
      disputed: true,
      updatedAt: "2026-09-04T00:00:00.000Z",
    }],
  });
  assert.equal(queue.items[0].type, "repair");
  assert.equal(queue.items[0].score >= 25, true);
});

test("identical inputs and clocks produce stable lexical tie-breaking", () => {
  const input = {
    now: new Date("2026-09-05T00:00:00.000Z"),
    budgetMinutes: 30,
    concepts: [concept({ id: "b", state: "unexplored" }), concept({ id: "a", state: "unexplored" })],
    repairs: [],
  };
  assert.deepEqual(buildTodayQueue(input), buildTodayQueue(input));
  assert.equal(buildTodayQueue(input).items.find((item) => item.type === "new")?.target.id, "a");
});

test("bridge opens the destination through the source lab edge challenge", () => {
  const queue = buildTodayQueue({
    now: new Date("2026-09-05T00:00:00.000Z"),
    budgetMinutes: 30,
    concepts: [concept({
      id: "logic-truth-table",
      title: "Logic mệnh đề",
      trackId: "r1-math",
      state: "practiced",
      evidence: { practice: met(), variant: missing(), transfer: missing(), delayed: missing() },
      blockedOutgoingEdgeIds: ["logic-to-conditional"],
    })],
    repairs: [],
  });

  const bridge = queue.items.find((item) => item.type === "bridge");
  assert.deepEqual(bridge?.target, {
    kind: "expansion",
    id: "logic-truth-table",
    mode: "practice",
    edgeId: "logic-to-conditional",
  });
  assert.match(bridge?.reason ?? "", /mở Xác suất có điều kiện/);
  assert.match(bridge?.evidenceNeeded ?? "", /logic-to-conditional/);
});

test("bridge uses the first blocked outgoing edge in the concept snapshot", () => {
  const queue = buildTodayQueue({
    concepts: [concept({
      id: "ml-split",
      title: "Train / validation / test simulator",
      trackId: "r3-machine-learning",
      state: "mastered",
      blockedOutgoingEdgeIds: ["split-to-regularization", "split-to-leakage"],
    })],
    repairs: [],
  });

  assert.equal(queue.items.find((item) => item.type === "bridge")?.target?.edgeId, "split-to-regularization");
});

test("locked expansion labs are excluded from new and practice candidates", () => {
  const queue = buildTodayQueue({
    now: new Date("2026-09-05T00:00:00.000Z"),
    budgetMinutes: 30,
    concepts: [
      concept({ id: "probability-conditional", title: "Locked new", trackId: "r1-math", unlocked: false }),
      concept({ id: "probability-bayes", title: "Locked practice", trackId: "r1-math", state: "learning", unlocked: false }),
      concept({ id: "problem-frame", title: "Available", state: "unexplored" }),
    ],
    repairs: [],
  });

  assert.equal(queue.items.some((item) => item.target?.id === "probability-conditional"), false);
  assert.equal(queue.items.some((item) => item.target?.id === "probability-bayes"), false);
  assert.equal(queue.items.find((item) => item.type === "new")?.target.id, "problem-frame");
});

test("concept assistance uses retries and novelty reasons do not invent unlock value", () => {
  const ordinaryCompletion = concept({
    id: "ordinary",
    title: "Ordinary",
    state: "learning",
    totalAttempts: 5,
    retryCount: 0,
  });
  const repeatedFailure = concept({
    id: "retrying",
    title: "Retrying",
    state: "learning",
    totalAttempts: 3,
    retryCount: 3,
  });
  const practiceQueue = buildTodayQueue({ concepts: [ordinaryCompletion, repeatedFailure], repairs: [] });
  assert.equal(practiceQueue.items.find((item) => item.type === "practice")?.target.id, "retrying");

  const newQueue = buildTodayQueue({ concepts: [concept({ id: "standalone", title: "Standalone" })], repairs: [] });
  const novelty = newQueue.items.find((item) => item.type === "new");
  assert.doesNotMatch(novelty?.reason ?? "", /prerequisite|mở khóa/);
  assert.match(novelty?.reason ?? "", /bằng chứng thực hành đầu tiên/);
});

test("selection clamps the budget and never exceeds it", () => {
  const input = {
    now: new Date("2026-09-05T00:00:00.000Z"),
    concepts: [
      concept({ id: "due", state: "review_due", nextReviewAt: "2026-09-01T00:00:00.000Z" }),
      concept({ id: "logic-truth-table", title: "Logic mệnh đề", trackId: "r1-math", state: "practiced", blockedOutgoingEdgeIds: ["logic-to-conditional"] }),
      concept({ id: "new", state: "unexplored" }),
    ],
    repairs: [],
  };

  const short = buildTodayQueue({ ...input, budgetMinutes: 1 });
  assert.equal(short.budgetMinutes, 15);
  assert.equal(short.totalMinutes, 13);
  assert.deepEqual(short.items.map((item) => item.type), ["review", "bridge"]);

  const long = buildTodayQueue({ ...input, budgetMinutes: 100 });
  assert.equal(long.budgetMinutes, 60);
  assert.equal(long.totalMinutes, 30);
  assert.deepEqual(long.items.map((item) => item.type), ["review", "bridge", "new", "reflection"]);
});
