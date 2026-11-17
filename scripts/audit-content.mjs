import { readFile } from "node:fs/promises";
import { gradeExplanation } from "../lib/explanation-grader.mjs";
import { explanationRubrics } from "../lib/explanation-rubrics.mjs";

const root = new URL("../", import.meta.url);
const readJson = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const [catalog, reviews, labs, qa, calibration] = await Promise.all([
  readJson("content/courses/raw-data-to-learning-model/catalog.json"),
  readJson("content/courses/raw-data-to-learning-model/reviews.json"),
  readJson("content/courses/raw-data-to-learning-model/python-labs.json"),
  readJson("content/courses/raw-data-to-learning-model/authoring-qa.json"),
  readJson("content/courses/raw-data-to-learning-model/explanation-calibration.json"),
]);
const [dashboard, css, codeCoach, localLearningLog, learningBackup, repairQueue, hosting] = await Promise.all([
  readFile(new URL("app/learning-dashboard.tsx", root), "utf8"),
  readFile(new URL("app/globals.css", root), "utf8"),
  readFile(new URL("lib/code-coach.ts", root), "utf8"),
  readFile(new URL("lib/local-learning-log.ts", root), "utf8"),
  readFile(new URL("lib/learning-backup.ts", root), "utf8"),
  readFile(new URL("lib/repair-queue.mjs", root), "utf8"),
  readJson(".openai/hosting.json"),
]);

const defects = [];
const check = (condition, message) => { if (!condition) defects.push(message); };
const unique = (items) => new Set(items).size === items.length;
const qaById = new Map(qa.lessons.map((lesson) => [lesson.id, lesson]));
const lessonIds = catalog.lessons.map((lesson) => lesson.id);

check(catalog.lessons.length === 14, "Course must contain exactly 14 lessons");
check(unique(lessonIds), "Lesson ids must be unique");
check(qa.lessons.length === catalog.lessons.length, "QA manifest must cover every lesson exactly once");
check(unique(qa.lessons.map((lesson) => lesson.id)), "QA manifest lesson ids must be unique");
check(Object.keys(reviews).sort().join("|") === [...lessonIds].sort().join("|"), "Delayed reviews must match catalog lessons");
check(Object.keys(labs).sort().join("|") === [...lessonIds].sort().join("|"), "Python labs must match catalog lessons");

const explanationActivities = new Map(catalog.lessons.flatMap((lesson) => lesson.activities.filter((activity) => activity.input.kind === "text").map((activity) => [activity.id, activity])));
check(calibration.lessons.length === explanationActivities.size, "Calibration must cover every explanation activity");
check(Object.keys(explanationRubrics).sort().join("|") === [...explanationActivities.keys()].sort().join("|"), "Concept alias rubrics must match explanation activities");
let calibrationCaseCount = 0;
for (const lessonCases of calibration.lessons) {
  const activity = explanationActivities.get(lessonCases.activityId);
  check(Boolean(activity), `${lessonCases.lessonId}: calibration points to an unknown activity`);
  if (!activity) continue;
  check(lessonCases.accepted.length === 2 && lessonCases.rejected.length === 2, `${lessonCases.lessonId}: calibration needs two accepted and two rejected boundaries`);
  for (const sample of lessonCases.accepted) {
    const grade = gradeExplanation({ answer: sample.answer, input: activity.input, prompt: activity.prompt, hints: activity.hints, activityId: activity.id });
    check(grade.passed, `${lessonCases.lessonId}/${sample.id}: acceptable explanation was rejected as ${grade.diagnosis}`);
    calibrationCaseCount += 1;
  }
  for (const sample of lessonCases.rejected) {
    const answer = sample.kind === "hints" ? activity.hints.join(" ") : sample.answer;
    const grade = gradeExplanation({ answer, input: activity.input, prompt: activity.prompt, hints: activity.hints, activityId: activity.id });
    check(!grade.passed, `${lessonCases.lessonId}/${sample.id}: weak explanation was accepted`);
    if (sample.expectedDiagnosis) check(grade.diagnosis === sample.expectedDiagnosis, `${lessonCases.lessonId}/${sample.id}: expected ${sample.expectedDiagnosis}, received ${grade.diagnosis}`);
    calibrationCaseCount += 1;
  }
}
check(calibrationCaseCount === 56, "Calibration gate must contain exactly 56 boundary cases");

for (const lesson of catalog.lessons) {
  const lessonQa = qaById.get(lesson.id);
  check(Boolean(lessonQa), `${lesson.id}: missing authoring QA record`);
  if (!lessonQa) continue;

  check(lessonQa.outcomes.length >= 3 && unique(lessonQa.outcomes), `${lesson.id}: needs three distinct outcomes`);
  check(lessonQa.misconceptions.length >= 3 && unique(lessonQa.misconceptions), `${lesson.id}: needs three distinct misconceptions`);
  const source = qa.sources[lessonQa.sourceId];
  check(Boolean(source), `${lesson.id}: unknown source id ${lessonQa.sourceId}`);
  if (source) {
    check(source.title === lesson.source.title, `${lesson.id}: source title differs from verified registry`);
    check(source.approvedLocators.includes(lesson.source.locator), `${lesson.id}: source locator is not verified`);
  }

  check(lesson.activities.length === 5, `${lesson.id}: must have five activities`);
  check(unique(lesson.activities.map((activity) => activity.id)), `${lesson.id}: activity ids must be unique`);
  for (const activity of lesson.activities) {
    check(activity.prompt.length >= 20, `${lesson.id}/${activity.id}: prompt is too short`);
    check(activity.evidence.length >= 20, `${lesson.id}/${activity.id}: evidence statement is too short`);
    check(activity.success.length >= 20 && activity.retry.length >= 20, `${lesson.id}/${activity.id}: feedback is incomplete`);
    check(activity.hints.length === 2 && activity.hints.every((hint) => hint.length >= 15), `${lesson.id}/${activity.id}: needs two substantive hints`);

    if (activity.input.kind === "choice") {
      check(activity.input.options.length >= 3 && unique(activity.input.options), `${lesson.id}/${activity.id}: choice options must be distinct`);
      check(Number.isInteger(activity.input.correctIndex) && activity.input.correctIndex >= 0 && activity.input.correctIndex < activity.input.options.length, `${lesson.id}/${activity.id}: invalid correctIndex`);
    }
    if (activity.input.kind === "number") {
      check(Number.isFinite(activity.input.expected) && activity.input.tolerance > 0, `${lesson.id}/${activity.id}: invalid numeric answer gate`);
    }
    if (activity.input.kind === "text") {
      check(activity.input.minLength >= 70, `${lesson.id}/${activity.id}: explanation minimum is too shallow`);
      check(unique(activity.input.rubricTerms.map((term) => term.toLocaleLowerCase("vi"))), `${lesson.id}/${activity.id}: duplicate rubric terms`);
      check(activity.input.requiredTerms >= 3 && activity.input.requiredTerms <= activity.input.rubricTerms.length, `${lesson.id}/${activity.id}: invalid rubric threshold`);
      const pasteAttempt = gradeExplanation({ answer: activity.hints.join(" "), input: activity.input, prompt: activity.prompt, hints: activity.hints, activityId: activity.id });
      check(!pasteAttempt.passed, `${lesson.id}/${activity.id}: pasted hints bypass the explanation grader`);
      const decoratedPaste = gradeExplanation({ answer: `${activity.hints.join(" ")} Vì vậy các ý trên tạo ra kết quả.`, input: activity.input, prompt: activity.prompt, hints: activity.hints, activityId: activity.id });
      check(!decoratedPaste.passed, `${lesson.id}/${activity.id}: pasted hints plus a connector bypass the explanation grader`);
      check(Boolean(pasteAttempt.coach?.acknowledgement && pasteAttempt.coach?.gap && pasteAttempt.repair?.prompt), `${lesson.id}/${activity.id}: explanation feedback needs a natural repair action`);
    }
    if (activity.input.kind === "code") {
      const tests = labs[lesson.id]?.tests ?? [];
      check(tests.length === 3 && unique(tests.map((item) => item.name)), `${lesson.id}: needs three distinct hidden tests`);
      const quotedKey = codeCoach.includes(`"${lesson.id}"`) || codeCoach.includes(`${lesson.id}:`);
      check(quotedKey, `${lesson.id}: missing Code Coach entry`);
    }
  }

  const review = reviews[lesson.id];
  check(review.options.length >= 3 && unique(review.options), `${lesson.id}: delayed review options must be distinct`);
  check(review.explanation.length >= 30, `${lesson.id}: delayed review explanation is too short`);
}

check(unique(Object.values(reviews).map((review) => review.prompt)), "Delayed review prompts must be distinct");
check(qa.humanReviewStatus === "pending", "Automated QA must not impersonate human review");
check(dashboard.includes('aria-label="Điều hướng chính"') && dashboard.includes('aria-label="Điều hướng di động"'), "Primary navigation needs accessible labels");
check(dashboard.includes('<label className="response-field"'), "Learner inputs must keep visible labels");
check(css.includes(":focus") && css.includes("prefers-reduced-motion"), "Focus and reduced-motion rules are required");
check(hosting.d1 === null, "Single-device mode must not declare a hosted database");
check(localLearningLog.includes("MAX_EVENTS = 400") && localLearningLog.includes("window.localStorage"), "Personal learning traces need bounded browser-only storage");
check(!/(fetch\(|sendBeacon|WebSocket|cloudflare:workers)/.test(localLearningLog), "Local learning traces must not leave the browser");
check(localLearningLog.includes('"scoring_dispute"') && dashboard.includes("Kết quả chấm chưa hợp lý?"), "Personal mode must keep a local scoring-dispute path");
check(["DataLensLab", "FunctionMachine", "ErrorLab", "GradientLab", "ValidationLab"].every((name) => dashboard.includes(`function ${name}`)), "Every concept family needs a guided interactive mechanism lab");
check(learningBackup.includes("MAX_BACKUP_BYTES = 512_000") && learningBackup.includes("isLearningStorageKey"), "Local-first mode needs a bounded allowlisted backup format");
check(learningBackup.includes("Best-effort rollback") && dashboard.includes("LEARNING PASSPORT · PORTABLE CHECKPOINT"), "Backup restore needs rollback and a learner-facing checkpoint surface");
check(repairQueue.includes("MAX_REPAIR_ITEMS = 50") && repairQueue.includes("resolveRepairItem"), "Explanation failures need a bounded resolvable local repair queue");
check(dashboard.includes("Hàng đợi sửa mental model") && dashboard.includes("BƯỚC SỬA NHỎ NHẤT"), "Natural explanation coaching needs a learner-facing repair loop");

if (defects.length) {
  console.error(`Authoring QA failed with ${defects.length} defect(s):`);
  for (const defect of defects) console.error(`- ${defect}`);
  process.exit(1);
}

const misconceptionCount = qa.lessons.reduce((sum, lesson) => sum + lesson.misconceptions.length, 0);
const activityCount = catalog.lessons.reduce((sum, lesson) => sum + lesson.activities.length, 0);
const hiddenTestCount = Object.values(labs).reduce((sum, lab) => sum + lab.tests.length, 0);
console.log(`Authoring QA passed: ${catalog.lessons.length} lessons, ${activityCount} activities, ${misconceptionCount} misconception checks, ${hiddenTestCount} hidden tests, ${calibrationCaseCount} explanation boundaries, ${Object.keys(qa.sources).length} verified sources.`);
console.log("Human read-through and local scoring-dispute review remain pending.");
