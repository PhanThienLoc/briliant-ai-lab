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
