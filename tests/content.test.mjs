import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const allowedActivityTypes = new Set([
  "predict",
  "manipulate",
  "order",
  "response",
  "python",
  "transfer",
  "explain",
]);

test("the seed lesson contains teachable and traceable content", async () => {
  const lessonUrl = new URL(
    "../content/courses/raw-data-to-learning-model/vector-dot-product.json",
    import.meta.url,
  );
  const lesson = JSON.parse(await readFile(lessonUrl, "utf8"));

  assert.match(lesson.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.ok(lesson.title.length > 0);
  assert.ok(lesson.outcomes.length >= 3);
  assert.ok(lesson.misconceptions.length >= 3);
  assert.ok(lesson.activities.length >= 5);
  assert.ok(lesson.activities.every((activity) => allowedActivityTypes.has(activity.type)));
  assert.equal(new Set(lesson.activities.map((activity) => activity.id)).size, lesson.activities.length);
  assert.deepEqual(lesson.mastery, {
    requiresIndependent: true,
    requiresDelayed: true,
    requiresTransfer: true,
  });
  assert.ok(lesson.sources.length >= 2);
  assert.ok(lesson.sources.every((source) => source.title && source.locator));
});

test("the release-zero catalog contains fourteen runnable lessons", async () => {
  const catalogUrl = new URL(
    "../content/courses/raw-data-to-learning-model/catalog.json",
    import.meta.url,
  );
  const catalog = JSON.parse(await readFile(catalogUrl, "utf8"));

  assert.equal(catalog.lessons.length, 14);
  assert.equal(new Set(catalog.lessons.map((lesson) => lesson.id)).size, 14);
  for (const lesson of catalog.lessons) {
    assert.equal(lesson.activities.length, 5, `${lesson.id} must have five evidence activities`);
    assert.ok(lesson.concept && lesson.mechanism && lesson.transfer);
    assert.ok(lesson.source.title && lesson.source.locator);
    assert.deepEqual(
      lesson.activities.map((activity) => activity.input.kind),
      ["choice", lesson.activities[1].input.kind, "text", "code", "choice"],
    );
    assert.ok(lesson.activities.every((activity) => activity.hints.length === 2));
  }
});

test("every lesson has a distinct delayed-review transfer check", async () => {
  const catalog = JSON.parse(await readFile(new URL("../content/courses/raw-data-to-learning-model/catalog.json", import.meta.url), "utf8"));
  const reviews = JSON.parse(await readFile(new URL("../content/courses/raw-data-to-learning-model/reviews.json", import.meta.url), "utf8"));

  assert.deepEqual(Object.keys(reviews).sort(), catalog.lessons.map((lesson) => lesson.id).sort());
  for (const [lessonId, review] of Object.entries(reviews)) {
    assert.ok(review.prompt.length > 20, `${lessonId} needs a meaningful review prompt`);
    assert.ok(review.options.length >= 3);
    assert.ok(Number.isInteger(review.correctIndex));
    assert.ok(review.correctIndex >= 0 && review.correctIndex < review.options.length);
    assert.ok(review.explanation.length > 30);
  }
});

test("every Python activity is graded by three named hidden tests", async () => {
  const catalog = JSON.parse(await readFile(new URL("../content/courses/raw-data-to-learning-model/catalog.json", import.meta.url), "utf8"));
  const labs = JSON.parse(await readFile(new URL("../content/courses/raw-data-to-learning-model/python-labs.json", import.meta.url), "utf8"));

  assert.deepEqual(Object.keys(labs).sort(), catalog.lessons.map((lesson) => lesson.id).sort());
  for (const lesson of catalog.lessons) {
    const lab = labs[lesson.id];
    const codeActivity = lesson.activities.find((activity) => activity.input.kind === "code");
    assert.ok(codeActivity, `${lesson.id} needs a Python activity`);
    assert.equal(lab.tests.length, 3, `${lesson.id} needs three hidden tests`);
    assert.ok(lab.tests.every((hiddenTest) => hiddenTest.name && hiddenTest.expression && Object.hasOwn(hiddenTest, "expected")));
  }
});
