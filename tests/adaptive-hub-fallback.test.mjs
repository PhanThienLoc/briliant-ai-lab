import assert from "node:assert/strict";
import test from "node:test";
import { buildFallbackTodayQueue } from "../lib/adaptive-hub-fallback.ts";

const now = new Date("2026-09-05T00:00:00.000Z");
const due = (id, nextReviewAt, trackId = "r0") => ({
  id, title: id, trackId, state: "review_due", nextReviewAt,
});

test("queue failure retains due reviews in existing due-date order and their runtime routes", () => {
  const queue = buildFallbackTodayQueue([
    due("probability-bayes", "2026-09-04T00:00:00.000Z", "r1-math"),
    due("vectors", "2026-09-02T00:00:00.000Z"),
    due("sql-select", "2026-09-03T00:00:00.000Z", "r2-sql-algorithms"),
  ], [], now, 30);

  assert.deepEqual(queue.items.map((item) => item.id), ["review:vectors", "review:sql-select", "review:probability-bayes"]);
  assert.deepEqual(queue.items[0].target, { kind: "lesson", id: "vectors", activityId: null, mode: "review" });
  assert.deepEqual(queue.items[1].target, { kind: "expansion", id: "sql-select", mode: "review" });
  assert.equal(queue.totalMinutes, 15);
});

test("fallback excludes future reviews and retains repair activity under the session budget", () => {
  const repairs = [{ id: "fix-vectors", lessonId: "vectors", activityId: "vec-explain", title: "Sửa giải thích", prompt: "Nối cơ chế" }];
  const queue = buildFallbackTodayQueue([
    due("vectors", "2026-09-06T00:00:00.000Z"),
    due("sql-select", "2026-09-04T00:00:00.000Z", "r2-sql-algorithms"),
  ], repairs, now, 15);

  assert.deepEqual(queue.items.map((item) => item.id), ["review:sql-select", "repair:fix-vectors"]);
  assert.deepEqual(queue.items[1].target, { kind: "lesson", id: "vectors", activityId: "vec-explain", mode: "practice" });
  assert.equal(queue.totalMinutes, 13);
});
