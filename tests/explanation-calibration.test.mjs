import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { gradeExplanation } from "../lib/explanation-grader.mjs";
import { explanationRubrics } from "../lib/explanation-rubrics.mjs";

const readJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));

test("all fourteen explanation activities have four human-readable boundary cases", async () => {
  const [catalog, calibration] = await Promise.all([
    readJson("../content/courses/raw-data-to-learning-model/catalog.json"),
    readJson("../content/courses/raw-data-to-learning-model/explanation-calibration.json"),
  ]);
  const explanationActivities = catalog.lessons.flatMap((lesson) => lesson.activities
    .filter((activity) => activity.input.kind === "text")
    .map((activity) => ({ lesson, activity })));

  assert.equal(explanationActivities.length, 14);
  assert.equal(calibration.lessons.length, 14);
  assert.deepEqual(
    calibration.lessons.map((item) => item.activityId).sort(),
    explanationActivities.map(({ activity }) => activity.id).sort(),
  );
  assert.deepEqual(Object.keys(explanationRubrics).sort(), explanationActivities.map(({ activity }) => activity.id).sort());

  for (const item of calibration.lessons) {
    assert.equal(item.accepted.length, 2, `${item.lessonId}: needs canonical and synonym-positive cases`);
    assert.equal(item.rejected.length, 2, `${item.lessonId}: needs copied-hint and fluent-negative cases`);
    assert.ok(item.accepted.some((entry) => entry.id === "synonym-boundary"), `${item.lessonId}: missing synonym boundary`);
    assert.ok(item.rejected.some((entry) => entry.id === "hint-copy"), `${item.lessonId}: missing hint-copy boundary`);
  }
});

test("calibration gate has zero false rejects and zero false accepts across 56 cases", async () => {
  const [catalog, calibration] = await Promise.all([
    readJson("../content/courses/raw-data-to-learning-model/catalog.json"),
    readJson("../content/courses/raw-data-to-learning-model/explanation-calibration.json"),
  ]);
  const activities = new Map(catalog.lessons.flatMap((lesson) => lesson.activities.map((activity) => [activity.id, activity])));
  let accepted = 0;
  let rejected = 0;
  const mismatches = [];

  for (const lessonCases of calibration.lessons) {
    const activity = activities.get(lessonCases.activityId);
    assert.ok(activity, `${lessonCases.activityId}: activity missing from catalog`);
    for (const sample of lessonCases.accepted) {
      const grade = gradeExplanation({ answer: sample.answer, input: activity.input, prompt: activity.prompt, hints: activity.hints, activityId: activity.id });
      if (!grade.passed) mismatches.push(`${lessonCases.lessonId}/${sample.id} falsely rejected as ${grade.diagnosis}: ${grade.message}`);
      accepted += 1;
    }
    for (const sample of lessonCases.rejected) {
      const answer = sample.kind === "hints" ? activity.hints.join(" ") : sample.answer;
      const grade = gradeExplanation({ answer, input: activity.input, prompt: activity.prompt, hints: activity.hints, activityId: activity.id });
      if (grade.passed) mismatches.push(`${lessonCases.lessonId}/${sample.id} falsely accepted`);
      if (sample.expectedDiagnosis && grade.diagnosis !== sample.expectedDiagnosis) mismatches.push(`${lessonCases.lessonId}/${sample.id} expected ${sample.expectedDiagnosis}, got ${grade.diagnosis}`);
      rejected += 1;
    }
  }

  assert.equal(accepted, 28);
  assert.equal(rejected, 28);
  assert.deepEqual(mismatches, []);
});

test("concept aliases recover a reasonable synonym answer in every lesson", async () => {
  const [catalog, calibration] = await Promise.all([
    readJson("../content/courses/raw-data-to-learning-model/catalog.json"),
    readJson("../content/courses/raw-data-to-learning-model/explanation-calibration.json"),
  ]);
  const activities = new Map(catalog.lessons.flatMap((lesson) => lesson.activities.map((activity) => [activity.id, activity])));
  const recovered = [];

  for (const lessonCases of calibration.lessons) {
    const activity = activities.get(lessonCases.activityId);
    const sample = lessonCases.accepted.find((entry) => entry.id === "synonym-boundary");
    const legacy = gradeExplanation({ answer: sample.answer, input: activity.input, prompt: activity.prompt, hints: activity.hints });
    const calibrated = gradeExplanation({ answer: sample.answer, input: activity.input, prompt: activity.prompt, hints: activity.hints, activityId: activity.id });
    if (!legacy.passed && calibrated.passed) recovered.push(lessonCases.lessonId);
  }

  assert.equal(recovered.length, 14);
});
