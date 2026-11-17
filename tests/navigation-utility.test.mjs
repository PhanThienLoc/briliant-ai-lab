import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("view changes reset scroll and lesson return labels preserve origin", async () => {
  const dashboard = await read("../app/learning-dashboard.tsx");

  assert.match(dashboard, /window\.scrollTo\(\{ top: 0, left: 0, behavior: "auto" \}\)/);
  assert.match(dashboard, /const \[returnView, setReturnView\] = useState<View>\("hub"\)/);
  assert.match(dashboard, /setReturnView\(view\)/);
  assert.match(dashboard, /returnLabel=\{navItems\.find/);
});

test("Help and History are keyboard-accessible real controls", async () => {
  const dashboard = await read("../app/learning-dashboard.tsx");

  assert.match(dashboard, /<button className="side-link" onClick=\{onHelp\}/);
  assert.match(dashboard, /<button className="side-link" onClick=\{onHistory\}/);
  assert.match(dashboard, /role="dialog" aria-modal="true"/);
  assert.match(dashboard, /event\.key === "Escape"/);
  assert.doesNotMatch(dashboard, /<span className="quiet-link">View History/);
});

test("recent dialogues use the device learning log instead of demo rows", async () => {
  const [dashboard, localLog] = await Promise.all([
    read("../app/learning-dashboard.tsx"),
    read("../lib/local-learning-log.ts"),
  ]);

  assert.match(localLog, /export function getLocalLearningHistory/);
  assert.match(dashboard, /entries\.filter\(\(entry\) => entry\.lessonId\)/);
  assert.doesNotMatch(dashboard, /todayQueue\.slice/);
});

test("four primary destinations and secondary tools share accessible desktop and mobile navigation", async () => {
  const dashboard = await read("../app/learning-dashboard.tsx");
  const primary = dashboard.slice(dashboard.indexOf("const navItems:"), dashboard.indexOf("const secondaryItems:"));
  assert.deepEqual([...primary.matchAll(/id: "([^"]+)"/g)].map((match) => match[1]), ["hub", "library", "studio", "reviews"]);
  for (const label of ["Hôm nay", "Thư viện", "Tạo khóa học", "Ôn tập"]) assert.ok(primary.includes(label));
  assert.match(dashboard, /href="#main-content"/);
  assert.match(dashboard, /<main id="main-content" tabIndex=\{-1\}/);
  assert.match(dashboard, /Tiến độ trên thiết bị/);
  assert.doesNotMatch(dashboard, /Level: Analyzing|Deep Learner|<span>PL<\/span>/);
});

test("Review keeps exact lesson modes, source targets, and expansion return origins", async () => {
  const dashboard = await read("../app/learning-dashboard.tsx");
  assert.match(dashboard, /onStart\(item\.lessonId, null, item\.state === "review_due" \? "review" : "practice"\)/);
  assert.match(dashboard, /onOpen\(course\.id, lesson\.id\)/);
  assert.match(dashboard, /setSourceReturnView\(view\)/);
  assert.match(dashboard, /openView\(sourceReturnView\)/);
  assert.match(dashboard, /setExpansionReturnView\(view\)/);
  assert.match(dashboard, /onReviewClose=\{\(\) => \{ setActiveExpansionReviewId\(null\); openView\(expansionReturnView\)/);
  assert.match(dashboard, /setView\(returnView\)/);
});
