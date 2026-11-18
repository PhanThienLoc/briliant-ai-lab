import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Today Session exposes dynamic budget, reasons, evidence, and semantic progress", async () => {
  const source = await read("../components/learning/today-session.tsx");

  assert.match(source, /\{queue\.totalMinutes\} \/ \{queue\.budgetMinutes\} phút dự kiến/);
  assert.match(source, /Vì sao chọn bài này/);
  assert.match(source, /item\.reason/);
  assert.match(source, /item\.evidenceNeeded/);
  assert.match(source, /aria-label=/);
  assert.match(source, /aria-current=/);
});

test("reflection actions stay readable and never open a null target", async () => {
  const source = await read("../components/learning/today-session.tsx");

  assert.match(source, /item\.target \? "button" : "div"/);
  assert.match(source, /onClick=\{item\.target \? \(\) => onOpen\(item\) : undefined\}/);
});

test("Mastery Summary names every actionable state and counts only locked concepts", async () => {
  const source = await read("../components/learning/mastery-summary.tsx");

  assert.match(source, /Ổn định/);
  assert.match(source, /Đến hạn/);
  assert.match(source, /Cần sửa/);
  assert.match(source, /Bị khóa/);
  assert.match(source, /item\.unlocked === false/);
  assert.doesNotMatch(source, /"Bị khóa"[^\n]*prerequisite_blocked/);
});

test("adaptive cards use calm surfaces, readable text, and touch targets", async () => {
  const css = await read("../app/stitch-theme.css");
  assert.match(css, /\.today-session/);
  assert.match(css, /\.today-action/);
  assert.match(css, /min-height:\s*64px/);
  assert.match(css, /font-size:\s*16px/);
  assert.match(css, /\.mastery-pulse/);
});

test("Home separates hydration from empty queues and exposes the diagnostic action", async () => {
  const [hub, session] = await Promise.all([read("../components/learning/adaptive-hub.tsx"), read("../components/learning/today-session.tsx")]);
  assert.match(hub, /state\.hydrated\s*\?/);
  assert.match(hub, /Đang đọc tiến độ/);
  assert.match(session, /onDiagnostic/);
  assert.match(session, /onClick=\{onDiagnostic\}/);
});

test("adaptive cards stack at the existing mobile breakpoint", async () => {
  const css = await read("../app/globals.css");
  const mobile = css.match(/@media \(max-width: 640px\) \{([\s\S]*?)\n\}/)?.[1] ?? "";

  assert.match(mobile, /\.today-session > header\s*\{[^}]*flex-direction:\s*column/s);
  assert.match(mobile, /\.mastery-pulse\s*\{[^}]*grid-template-columns:\s*1fr/s);
  assert.match(mobile, /\.mastery-pulse dl\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
});

test("AdaptiveHub hydrates local state after mount and routes by target kind", async () => {
  const source = await read("../components/learning/adaptive-hub.tsx");
  assert.match(source, /useState<AdaptiveHubState>\(initialAdaptiveHubState\)/);
  assert.match(source, /useEffect\(\(\) =>/);
  assert.match(source, /createLocalStorageLearningRepository\(window\.localStorage\)/);
  assert.match(source, /projectConceptEvidence/);
  assert.match(source, /evaluateAdaptiveMastery/);
  assert.match(source, /buildTodayQueue/);
  assert.match(source, /target\.kind === "lesson"/);
  assert.match(source, /target\.kind === "expansion"/);
});

test("dashboard uses the adaptive Hub boundary instead of four direct storage hooks", async () => {
  const source = await read("../app/learning-dashboard.tsx");
  assert.match(source, /useAdaptiveHubState\(masteryRevision\)/);
  assert.match(source, /<AdaptiveHub/);
  assert.doesNotMatch(source, /function useMasterySnapshot/);
  assert.doesNotMatch(source, /function useRepairItems/);
  assert.doesNotMatch(source, /function useExpansionProgressSnapshot/);
  assert.doesNotMatch(source, /function useLocalLearningHistory/);
});

test("adaptive Hub refreshes when the clock moves while the Hub remains open", async () => {
  const source = await read("../components/learning/adaptive-hub.tsx");
  assert.match(source, /setInterval\(/);
  assert.match(source, /clearInterval\(/);
  assert.match(source, /\[revision, clockRevision\]/);
});

test("adaptive routes preserve lesson mode, repair activity, and expansion bridge edge", async () => {
  const [hub, dashboard, workbench] = await Promise.all([
    read("../components/learning/adaptive-hub.tsx"),
    read("../app/learning-dashboard.tsx"),
    read("../app/expansion-workbench.tsx"),
  ]);

  assert.match(hub, /onLesson\(target\.id, target\.activityId, target\.mode\)/);
  assert.match(hub, /onExpansion\(target\.id, target\.mode === "review", target\.edgeId\)/);
  assert.match(dashboard, /initialMode=\{activeLessonMode\}/);
  assert.match(dashboard, /initialEdgeId=\{activeExpansionEdgeId\}/);
  assert.match(workbench, /initialEdgeId/);
  assert.match(workbench, /edge\.id === focusedEdgeId/);
});
