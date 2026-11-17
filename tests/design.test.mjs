import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const luminance = (hex) => hex.slice(1).match(/../g).map((channel) => parseInt(channel, 16) / 255)
    .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);

test("the interface follows the approved calm learning system", async () => {
  const css = await readFile(new URL("../app/stitch-theme.css", import.meta.url), "utf8");
  const dashboard = await readFile(
    new URL("../app/learning-dashboard.tsx", import.meta.url),
    "utf8",
  );
  const catalog = await readFile(
    new URL("../content/courses/raw-data-to-learning-model/catalog.json", import.meta.url),
    "utf8",
  );

  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.ok(layout.indexOf('"./stitch-theme.css"') > layout.indexOf('"./globals.css"'));
  const tokens = Object.fromEntries([...css.matchAll(/(--[\w-]+):\s*(#[\da-f]{6})/gi)].map((match) => [match[1], match[2]]));
  assert.deepEqual([tokens["--surface"], tokens["--surface-lowest"], tokens["--on-surface"], tokens["--on-surface-variant"], tokens["--primary"], tokens["--secondary-container"], tokens["--tertiary-container"]],
    ["#F7F8F2", "#FFFFFF", "#17241D", "#526258", "#157347", "#EAF5E9", "#245B98"]);
  for (const [foreground, background] of [
    ["--on-surface", "--surface"], ["--on-surface-variant", "--surface-lowest"],
    ["--on-dark", "--primary"], ["--on-surface", "--secondary-container"],
    ["--tertiary-container", "--surface-lowest"], ["--on-surface-variant", "--secondary-container"],
  ]) {
    const values = [luminance(tokens[foreground]), luminance(tokens[background])].sort((a, b) => b - a);
    assert.ok((values[0] + 0.05) / (values[1] + 0.05) >= 4.5, `${foreground} on ${background} must reach 4.5:1`);
  }
  assert.match(css, /Inter, Manrope, Arial, sans-serif/);
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
  assert.match(dashboard, /Mastery chỉ mở sau bài ôn độc lập ≥ 72 giờ/);
  assert.match(dashboard, /isolated WebAssembly sandbox/);
  assert.match(dashboard, /Run hidden tests/);
  assert.match(dashboard, /runPythonLab/);
  assert.match(dashboard, /getLesson\(lessonId\)/);
  assert.match(dashboard, /lesson\.activities\.map/);
  assert.match(dashboard, /Delayed recall queue/);
  assert.match(dashboard, /DELAYED TRANSFER/);
  assert.match(dashboard, /useAdaptiveHubState/);
  assert.match(dashboard, /lessonEvidenceScore/);
  assert.match(dashboard, /FOUNDATION DIAGNOSTIC/);
  assert.match(dashboard, /EARLIEST KNOWLEDGE GAP/);
  assert.match(dashboard, /briliantai\.diagnostic\.v1/);
  assert.match(dashboard, /Trước khi nộp, tự hỏi 3 câu/);
  assert.match(dashboard, /Hàng đợi sửa mental model/);
  assert.match(dashboard, /BƯỚC SỬA NHỎ NHẤT/);
  assert.match(dashboard, /CALIBRATED · 56 CASES/);
  assert.match(dashboard, /Không nhớ lệnh Python/);
  assert.match(dashboard, /Xác minh code không trợ giúp/);
  assert.match(dashboard, /DATA LENS · REACTIVE SAMPLE/);
  assert.match(dashboard, /FUNCTION MACHINE · SAME RULE, NEW INPUT/);
  assert.match(dashboard, /ERROR LAB · LINKED REPRESENTATIONS/);
  assert.match(dashboard, /GRADIENT DESCENT · STEP BY STEP/);
  assert.match(dashboard, /GENERALIZATION LAB · TRAIN ≠ TEST/);
  assert.match(dashboard, /LEARNING PASSPORT · PORTABLE CHECKPOINT/);
  assert.match(dashboard, /Xác nhận khôi phục/);
});

test("calm surfaces retain explicit readable child colors and learning state semantics", async () => {
  const [css, dashboard, expansion] = await Promise.all([
    readFile(new URL("../app/stitch-theme.css", import.meta.url), "utf8"),
    readFile(new URL("../app/learning-dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/expansion-workbench.tsx", import.meta.url), "utf8"),
  ]);
  const tokens = Object.fromEntries([...css.matchAll(/(--[\w-]+):\s*(#[\da-f]{6})/gi)].map((match) => [match[1], match[2]]));
  const valueFor = (selector, property) => {
    let value;
    for (const rule of css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (rule[1].split(",").some((candidate) => candidate.trim() === selector)) {
        value = rule[2].match(new RegExp(`(?:^|;)\\s*${property}:\\s*([^;]+)`))?.[1]?.trim() ?? value;
      }
    }
    return tokens[value?.match(/^var\((--[\w-]+)\)$/)?.[1]] ?? value;
  };
  // Resolve final descendant ink against the actual panel color, then compute WCAG contrast.
  // Parent-only surface edits previously left these children almost invisible.
  for (const [child, panel] of [
    [".dense-equation .dense-result > span", ".dense-equation .dense-result"],
    [".dense-equation .dense-result > output", ".dense-equation .dense-result"],
    [".token-input > span", ".token-input"], [".embedding-readout span", ".embedding-readout"],
    [".gradient-chain .gradient-card > span", ".gradient-chain .gradient-card"],
    [".code-coach > .outline-action", ".code-coach"], [".code-coach > .text-link", ".code-coach"],
  ]) {
    const pair = [valueFor(child, "color"), valueFor(panel, "background")];
    assert.ok(pair.every((value) => /^#[\da-f]{6}$/i.test(value)), `resolved contrast pair: ${child}`);
    const values = pair.map(luminance).sort((a, b) => b - a);
    assert.ok((values[0] + 0.05) / (values[1] + 0.05) >= 4.5, `${child} on ${panel} must reach 4.5:1`);
  }
  for (const selector of [".app-shell .mental-block p", ".app-shell .delayed-review > p", ".app-shell .activity-brief > p", ".app-shell .hint-text", ".app-shell .hint-ladder p"]) {
    assert.ok(parseFloat(valueFor(selector, "font-size")) >= 16, `readable prose: ${selector}`);
  }
  assert.ok(parseFloat(valueFor(".app-shell .response-field > span", "font-size")) >= 14);
  assert.match(dashboard, /aria-current=\{view === item.id/);
  assert.match(dashboard, /aria-pressed=\{choice === index\}/);
  assert.match(expansion, /aria-pressed=\{!scaled\}/);
  assert.match(expansion, /aria-pressed=\{track\.id === trackId\}/);
  assert.match(css, /focus-visible/);
});
