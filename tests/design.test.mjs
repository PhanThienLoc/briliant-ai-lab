import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the interface keeps its anti-template design guardrails", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const dashboard = await readFile(
    new URL("../app/learning-dashboard.tsx", import.meta.url),
    "utf8",
  );

  assert.match(css, /--radius-control:\s*6px/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /button\s*\{\s*min-height:\s*44px/);
  assert.doesNotMatch(css, /backdrop-filter/i);
  assert.doesNotMatch(css, /transition:\s*all/i);
  assert.match(dashboard, /NEXT BEST ACTION/);
  assert.match(dashboard, /Bằng chứng còn thiếu/);
  assert.match(dashboard, /DỰ ĐOÁN TRƯỚC KHI THỬ/);
});
