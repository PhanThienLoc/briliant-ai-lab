import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const diagnosticUrl = new URL("../content/courses/raw-data-to-learning-model/diagnostic.json", import.meta.url);

test("diagnostic covers five foundation axes with two questions each", async () => {
  const diagnostic = JSON.parse(await readFile(diagnosticUrl, "utf8"));
  const catalog = JSON.parse(await readFile(new URL("../content/courses/raw-data-to-learning-model/catalog.json", import.meta.url), "utf8"));
  const counts = Object.groupBy(diagnostic.questions, (question) => question.axis);
  const lessonIds = new Set(catalog.lessons.map((lesson) => lesson.id));

  assert.equal(diagnostic.questions.length, 10);
  assert.deepEqual(Object.keys(counts).sort(), ["data", "math", "optimization", "problem_framing", "validation"]);
  assert.ok(Object.values(counts).every((questions) => questions.length === 2));
  assert.equal(new Set(diagnostic.questions.map((question) => question.id)).size, 10);
  assert.ok(diagnostic.questions.every((question) => question.options.length === 4));
  assert.ok(diagnostic.questions.every((question) => question.correctIndex >= 0 && question.correctIndex < question.options.length));
  assert.ok(diagnostic.questions.every((question) => lessonIds.has(question.remediationLessonId)));
});

test("diagnostic scoring is deterministic and recommends the earliest gap", async () => {
  const source = await readFile(new URL("../lib/diagnostic.ts", import.meta.url), "utf8");

  assert.match(source, /score <= 4 \? "foundation" : score <= 7 \? "building" : "ready"/);
  assert.match(source, /recommendedLessonId === "capstone"/);
  assert.match(source, /question\.remediationLessonId/);
  assert.match(source, /Object\.keys\(candidate\.answers\)\.length !== diagnosticCatalog\.questions\.length/);
});
