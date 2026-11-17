import assert from "node:assert/strict";
import test from "node:test";
import { markRepairDisputed, readRepairQueue, resolveRepairItem, upsertRepairItem } from "../lib/repair-queue.mjs";

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

const repair = {
  lessonId: "vectors",
  activityId: "vec-explain",
  lessonTitle: "Vector và dot product",
  activityLabel: "Giải thích",
  reason: "copied_hint",
  title: "Tự dựng lại lời giải",
  prompt: "Đóng gợi ý lại và tự nối feature với prediction.",
  focusTerms: ["feature", "trọng số"],
  hintLevel: 2,
};

test("a repeated explanation failure updates one bounded repair item", () => {
  const storage = new MemoryStorage();
  upsertRepairItem(repair, storage, "2026-08-28T00:00:00.000Z");
  upsertRepairItem({ ...repair, prompt: "Viết lại cơ chế bằng ví dụ riêng." }, storage, "2026-08-28T00:01:00.000Z");
  const items = readRepairQueue(storage);

  assert.equal(items.length, 1);
  assert.equal(items[0].attempts, 2);
  assert.equal(items[0].prompt, "Viết lại cơ chế bằng ví dụ riêng.");
  assert.equal(items[0].hintLevel, 2);
});

test("a scoring dispute is prioritized and a successful retry removes the debt", () => {
  const storage = new MemoryStorage();
  upsertRepairItem(repair, storage, "2026-08-28T00:00:00.000Z");
  assert.equal(markRepairDisputed("vectors", "vec-explain", storage, "2026-08-28T00:02:00.000Z"), true);
  assert.equal(readRepairQueue(storage)[0].disputed, true);
  assert.equal(resolveRepairItem("vectors", "vec-explain", storage), true);
  assert.deepEqual(readRepairQueue(storage), []);
});
