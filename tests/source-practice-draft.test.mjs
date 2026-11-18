import assert from "node:assert/strict";
import test from "node:test";
import { buildSourceCourse, SOURCE_COURSES_KEY } from "../lib/source-course.ts";
import { SOURCE_PRACTICE_DRAFT_KEY, parseSourcePracticeDraft, readSourcePracticeDraft, saveSourcePracticeDraft, clearSourcePracticeDraft } from "../lib/source-practice-draft.ts";

const text = ["gradient", "validation", "features"].map((topic, i) => `Section ${i}: Understanding ${topic} requires examining a concrete input and tracing the resulting output carefully. The example about ${topic} shows why a measured change must be compared with an independent baseline. Another observation about ${topic} can then be checked without confusing the training evidence with an unseen evaluation.`).join("\n\n");
function fixture() {
  const course = buildSourceCourse({ title: "Draft", kind: "article", text, sourceName: "Source" }, new Date("2026-11-18T00:00:00Z"));
  return JSON.parse(JSON.stringify({ version: 1, course, selectedIds: [course.lessons[0].id], edits: { [course.lessons[0].id]: { title: "", objective: "Write my own explanation" } }, updatedAt: "2026-11-18T01:00:00Z" }));
}
function memory() {
  const values = new Map([[SOURCE_COURSES_KEY, "untouched learner evidence"]]);
  return { values, getItem: k => values.get(k) ?? null, setItem: (k,v) => values.set(k,v), removeItem: k => values.delete(k) };
}
test("draft round-trip preserves selection, edits and source while leaving saved courses unchanged", () => {
  const store = memory(), draft = fixture();
  saveSourcePracticeDraft(store, draft);
  assert.deepEqual(readSourcePracticeDraft(() => store), { draft, error: null });
  assert.equal(store.getItem(SOURCE_COURSES_KEY), "untouched learner evidence");
  clearSourcePracticeDraft(store);
  assert.deepEqual(readSourcePracticeDraft(() => store), { draft: null, error: null });
});
test("empty selection and blank edit remain resumable work in progress", () => {
  const draft = fixture(); draft.selectedIds = [];
  assert.deepEqual(parseSourcePracticeDraft(JSON.stringify(draft)), draft);
});
test("stale IDs, duplicate IDs, orphaned edits, oversize fields and dates reject before writing", () => {
  const base = fixture();
  for (const mutate of [
    d => d.selectedIds.push("foreign"),
    d => d.selectedIds.push(d.selectedIds[0]),
    d => d.edits.foreign = { title: "title", objective: "goal" },
    d => d.edits[d.selectedIds[0]].title = "x".repeat(101),
    d => d.updatedAt = "bad",
    d => d.course.lessons[0].completedAt = "2026-11-18T01:00:00Z",
  ]) {
    const draft = structuredClone(base); mutate(draft);
    const store = memory(); saveSourcePracticeDraft(store, base);
    const before = store.getItem(SOURCE_PRACTICE_DRAFT_KEY);
    assert.throws(() => saveSourcePracticeDraft(store, draft));
    assert.equal(store.getItem(SOURCE_PRACTICE_DRAFT_KEY), before);
  }
});
test("valid completed course cannot masquerade as an unearned draft", () => {
  const draft = fixture();
  Object.assign(draft.course.lessons[0], { completedAt: "2026-11-18T01:00:00Z", reviewDueAt: "2026-11-21T01:00:00Z" });
  assert.throws(() => parseSourcePracticeDraft(JSON.stringify(draft)), /Bản nháp/);
});
test("read permission errors, corrupt records and oversized payloads fail closed", () => {
  assert.ok(readSourcePracticeDraft(() => { throw Error("denied"); }).error);
  for (const raw of ["{", "null", "x".repeat(2_000_001)]) {
    const store = memory(); store.setItem(SOURCE_PRACTICE_DRAFT_KEY, raw);
    assert.ok(readSourcePracticeDraft(() => store).error);
    assert.throws(() => saveSourcePracticeDraft(store, fixture()));
    assert.equal(store.getItem(SOURCE_PRACTICE_DRAFT_KEY), raw);
  }
});
test("quota failure preserves the last valid bytes and reports recovery guidance", () => {
  const store = memory(); saveSourcePracticeDraft(store, fixture());
  const before = store.getItem(SOURCE_PRACTICE_DRAFT_KEY);
  const blocked = { getItem: store.getItem, setItem() { throw Error("quota"); } };
  assert.throws(() => saveSourcePracticeDraft(blocked, fixture()), /bộ nhớ đầy/);
  assert.equal(store.getItem(SOURCE_PRACTICE_DRAFT_KEY), before);
  assert.throws(() => clearSourcePracticeDraft({ removeItem() { throw Error("denied"); } }), /Không xóa/);
});
