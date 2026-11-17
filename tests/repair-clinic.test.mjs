import assert from "node:assert/strict";
import test from "node:test";
import { lessonCatalog } from "../lib/lesson-catalog.ts";
import { readRepairQueue, upsertRepairItem } from "../lib/repair-queue.mjs";

const clinic = await import("../lib/repair-clinic.mjs").catch(() => ({}));

test("every explanation repair has a counterexample and an independent variant", () => {
  assert.equal(typeof clinic.clinicForRepair, "function");
  assert.equal(typeof clinic.gradeClinicChoice, "function");
  const ids = lessonCatalog.lessons.map((lesson) => lesson.activities.find((activity) => activity.input.kind === "text")?.id);
  for (const id of ids) {
    const card = clinic.clinicForRepair(id);
    assert.ok(card, `missing clinic card for ${id}`);
    assert.ok(card.counterexample.length >= 45);
    assert.ok(card.question.length >= 35);
    assert.equal(card.options.length, 3);
    assert.equal(new Set(card.options).size, 3);
    assert.ok(card.options.every((option) => option.length >= 15));
    assert.ok(card.explanation.length >= 45);
    assert.equal(clinic.gradeClinicChoice(card, card.correctIndex), true);
    assert.equal(clinic.gradeClinicChoice(card, (card.correctIndex + 1) % 3), false);
  }
  assert.equal(clinic.clinicForRepair("unknown-explain"), null);
});

test("a correct clinic variant cannot erase the original explanation debt", () => {
  assert.equal(typeof clinic.gradeClinicChoice, "function");
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const item = upsertRepairItem({ lessonId: "vectors", activityId: "vec-explain", lessonTitle: "Vector", activityLabel: "Giải thích", reason: "missing_concepts", title: "Thiếu mắt xích", prompt: "Nối feature với dự đoán.", focusTerms: ["feature"], hintLevel: 0 }, storage);
  const card = clinic.clinicForRepair(item.activityId);
  assert.equal(clinic.gradeClinicChoice(card, card.correctIndex), true);
  assert.deepEqual(readRepairQueue(storage).map((repair) => repair.id), ["vectors:vec-explain"]);
});
