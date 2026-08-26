import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the interface follows the structured academic template", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const dashboard = await readFile(
    new URL("../app/learning-dashboard.tsx", import.meta.url),
    "utf8",
  );
  const catalog = await readFile(
    new URL("../content/courses/raw-data-to-learning-model/catalog.json", import.meta.url),
    "utf8",
  );

  assert.match(css, /--radius-control:\s*4px/);
  assert.match(css, /--radius-panel:\s*8px/);
  assert.match(css, /--primary-container:\s*#131b2e/i);
  assert.match(css, /--secondary:\s*#006c49/i);
  assert.match(css, /Source Serif 4/);
  assert.match(css, /Hanken Grotesk/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /button\s*\{\s*min-height:\s*44px/);
  assert.doesNotMatch(css, /backdrop-filter/i);
  assert.doesNotMatch(css, /transition:\s*all/i);
  assert.match(dashboard, /NEXT BEST ACTION/);
  assert.match(dashboard, /Bằng chứng còn thiếu/);
  assert.match(catalog, /Dự đoán trước/);
  assert.match(dashboard, /Socratic Lab/);
  assert.match(dashboard, /Aspects Breakdown/);
  assert.match(catalog, /PREDICT BEFORE INSTRUCTION/);
  assert.match(catalog, /FEYNMAN CHECK/);
  assert.match(catalog, /IMPLEMENT THE MECHANISM/);
  assert.match(catalog, /NOVEL CONTEXT/);
  assert.match(dashboard, /localStorage\.setItem/);
  assert.match(dashboard, /Mastery chỉ mở sau bài ôn trì hoãn ≥ 72 giờ/);
  assert.match(dashboard, /structural checks/);
  assert.match(dashboard, /getLesson\(lessonId\)/);
  assert.match(dashboard, /lesson\.activities\.map/);
});
