"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ExpansionWorkbench } from "./expansion-workbench";
import { SourceStudio } from "./source-studio";
import { AiProvider } from "../components/learning/ai-context";
import { AiSettings } from "../components/learning/ai-settings";
import { readSourceCourses, type SourceCoursesReadResult } from "../lib/source-course";
import { AdaptiveHub, useAdaptiveHubState, type AdaptiveHubState } from "../components/learning/adaptive-hub";
import { curriculum } from "../lib/curriculum";
import { getCodeCoach } from "../lib/code-coach";
import { diagnosticCatalog, scoreDiagnostic, type DiagnosticAxis, type DiagnosticResult } from "../lib/diagnostic";
import { gradeExplanation } from "../lib/explanation-grader.mjs";
import { createLearningBackup, MAX_BACKUP_BYTES, parseLearningBackupText, restoreLearningBackup, summarizeLearningBackup, type LearningBackup } from "../lib/learning-backup";
import { expansionLabs, expansionTracks, getExpansionLab, isExpansionLabId, type ExpansionEdgeId, type ExpansionLabId } from "../lib/expansion-catalog";
import { dueExpansionReviews, emptyExpansionProgress, type ExpansionProgress } from "../lib/expansion-progress";
import { getLesson, getPythonLab, getReview, lessonCatalog, type LessonContent } from "../lib/lesson-catalog";
import { getLocalLearningSummary, recordLearningEvent, type LocalLearningEvent, type LocalLearningSummary } from "../lib/local-learning-log";
import type { LearningRepositorySnapshot, RepairItemSnapshot } from "../lib/learning-repository";
import { markRepairDisputed, resolveRepairItem, upsertRepairItem } from "../lib/repair-queue.mjs";
import { clinicForRepair, gradeClinicChoice } from "../lib/repair-clinic.mjs";

function monotonicNow() {
  return typeof performance === "undefined" ? 0 : performance.now();
}
import { runPythonLab, type PythonRunResult, type RunnerPhase } from "../lib/python-runner";
import {
  hoursUntilReview,
  initialLessonProgress,
  lessonEvidenceScore,
  lessonEvidenceSummary,
  masteryLabel,
  masteryState,
  normalizeProgress,
  reviewDueAt,
  recordLessonAttempt,
  persistLessonProgress,
  type LessonProgress,
  type MasteryState,
} from "../lib/mastery-engine";

type View = "hub" | "library" | "studio" | "reviews" | "tracks" | "architect" | "checklist" | "settings";
type IconName = View | "lab" | "help" | "plus" | "arrow" | "brain";
type UtilityPanel = "help" | "history" | null;

const ASSET_RECOVERY_KEY = "briliantai.asset-recovery.v1";

function isStaleAssetFailure(value: unknown) {
  const message = value instanceof Error ? value.message : String(value ?? "");
  return /ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed|Loading CSS chunk|\/assets\/.*\.(?:js|css)/i.test(message);
}

function recoverFromStaleAssets() {
  try {
    if (window.sessionStorage.getItem(ASSET_RECOVERY_KEY) === "reloading") return;
    window.sessionStorage.setItem(ASSET_RECOVERY_KEY, "reloading");
  } catch {
    // Reload recovery still works when session storage is unavailable.
  }
  window.location.reload();
}

type ExplanationCoach = {
  acknowledgement: string;
  gap: string;
  nextPrompt: string;
};

type ActivityFeedback = {
  correct: boolean;
  message: string;
  criteria?: Array<{ id: string; label: string; passed: boolean }>;
  coach?: ExplanationCoach;
  repairQueued?: boolean;
};

type RepairItem = RepairItemSnapshot;

const navItems: Array<{ id: View; label: string }> = [
  { id: "hub", label: "Hôm nay" },
  { id: "library", label: "Thư viện" },
  { id: "studio", label: "Tạo khóa học" },
  { id: "reviews", label: "Ôn tập" },
];
const secondaryItems: Array<{ id: View; label: string }> = [
  { id: "tracks", label: "Tracks R0–R4" },
  { id: "architect", label: "Bản đồ kiến thức" },
  { id: "checklist", label: "Passport / Checklist" },
  { id: "settings", label: "Cài đặt AI" },
];

function Icon({ name }: { name: IconName }) {
  const shapes: Record<IconName, ReactNode> = {
    settings: <><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6 2.1-2.1" /></>,
    plus: <path d="M12 4v16M4 12h16" />,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9 9a3 3 0 116 0c0 2-3 2-3 4M12 17h.01" /></>,
    arrow: <path d="M4 12h16M14 6l6 6-6 6" />,
    hub: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>,
    library: <><path d="M4 4h4v16H4zM10 4h4v16h-4zM16 5l4-1 3 15-4 1z" /></>,
    reviews: <><path d="M4 8a8 8 0 111 10M4 3v5h5M12 7v5l3 2" /></>,
    studio: <><path d="M4 4h7a3 3 0 013 3v13H7a3 3 0 00-3 1V4zM20 4h-5a3 3 0 00-3 3v13h5a3 3 0 013 1V4z" /></>,
    tracks: <><path d="M4 6h6v6H4zM14 12h6v6h-6z" /><path d="M10 9h4M12 9v6h2" /></>,
    architect: <><circle cx="12" cy="4" r="1.5" /><circle cx="6" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M11.3 5.4L6.7 18.6M12.7 5.4l4.6 13.2M8 15h8" /></>,
    checklist: <><path d="M5 4h14v16H5z" /><path d="M8 9l2 2 4-4M8 15h8" /></>,
    lab: <><path d="M9 3h6M10 3v5l-5 9a3 3 0 002.6 4.5h8.8A3 3 0 0019 17l-5-9V3" /><path d="M8 16h8" /></>,
    brain: <><path d="M10 5a3 3 0 00-5 2.2A3.5 3.5 0 005 14v2a3 3 0 003 3h2V5zM14 5a3 3 0 015 2.2A3.5 3.5 0 0119 14v2a3 3 0 01-3 3h-2V5z" /><path d="M7 10h3M14 10h3M8 15h2M14 15h2" /></>,
  };

  return <svg className="line-icon" viewBox="0 0 24 24" aria-hidden="true">{shapes[name]}</svg>;
}

type LessonSnapshot = {
  lessonId: string;
  title: string;
  level: string;
  score: number;
  state: MasteryState;
  progress: LessonProgress;
  evidence: ReturnType<typeof lessonEvidenceSummary>;
};

function toLessonSnapshots(lessons: LearningRepositorySnapshot["lessons"]): LessonSnapshot[] {
  return lessonCatalog.lessons.map((lesson) => {
    const activityIds = lesson.activities.map((activity) => activity.id);
    const progress = normalizeProgress(lessons[lesson.id] ?? initialLessonProgress, lesson.activities.length, new Date(), activityIds);
    return {
      lessonId: lesson.id,
      title: lesson.title,
      level: lesson.level,
      score: lessonEvidenceScore(progress, lesson.activities.length, activityIds),
      state: masteryState(progress, lesson.activities.length, new Date(), activityIds),
      progress,
      evidence: lessonEvidenceSummary(progress, activityIds),
    };
  });
}

function ActiveTopics({ snapshots, recommendedLessonId, onStart, onMap }: { snapshots: LessonSnapshot[]; recommendedLessonId?: string; onStart: (lessonId: string) => void; onMap: () => void }) {
  const preferredIds = [...new Set([recommendedLessonId, "problem-frame", "vectors", "validation"].filter((id): id is string => Boolean(id)))].slice(0, 3);
  const topics = preferredIds.map((id) => snapshots.find((item) => item.lessonId === id)).filter((item): item is LessonSnapshot => Boolean(item));
  return (
    <section className="template-card achievement-card active-topics" aria-labelledby="active-topics-title">
      <div className="section-title-row">
        <h2 id="active-topics-title"><Icon name="brain" /> Active Topics</h2>
        <button className="text-link" onClick={onMap}>View All</button>
      </div>
      <div className="topic-grid">
        {topics.map((topic) => (
          <button className="topic-card" key={topic.title} onClick={() => onStart(topic.lessonId)}>
            <span className="mono-label">{topic.level.toUpperCase()}</span>
            <strong>{topic.title}</strong>
            <div className="topic-progress-label"><span>{masteryLabel(topic.state)}</span><b className={topic.state === "mastered" ? "emerald" : topic.state === "unexplored" ? "slate" : "indigo"}>{topic.score}%</b></div>
            <div className="progress-track"><i className={topic.state === "mastered" ? "emerald" : topic.state === "unexplored" ? "slate" : "indigo"} style={{ width: `${topic.score}%` }} /></div>
          </button>
        ))}
      </div>
    </section>
  );
}

const diagnosticAxisLabels: Record<DiagnosticAxis, string> = {
  problem_framing: "Problem framing",
  data: "Data",
  math: "Math",
  optimization: "Optimization",
  validation: "Validation",
};

function DiagnosticSummary({ result, onOpen, onStart }: { result: DiagnosticResult | null; onOpen: () => void; onStart: (lessonId: string) => void }) {
  const recommended = result ? getLesson(result.recommendedLessonId) : null;
  return (
    <section className={result ? "diagnostic-summary complete" : "diagnostic-summary"} aria-labelledby="diagnostic-summary-title">
      <div>
        <span className="mono-label">ENTRY BASELINE · 8 MINUTES</span>
        <h2 id="diagnostic-summary-title">{result ? `Diagnostic ${result.score}/${result.total}` : "Tìm đúng điểm bắt đầu"}</h2>
        <p>{result && recommended ? `Lỗ hổng sớm nhất nằm trước “${recommended.title}”. Đây là next best action của ông.` : "10 câu ngắn đo problem framing, data, math, optimization và validation. Kết quả không cấp mastery."}</p>
      </div>
      <div className="diagnostic-summary-action">
        {result && recommended ? <button className="primary-action" onClick={() => onStart(recommended.id)}>Học bài đề xuất →</button> : <button className="primary-action" onClick={onOpen}>Bắt đầu diagnostic →</button>}
        {result ? <button className="text-link" onClick={onOpen}>Xem kết quả / làm lại</button> : null}
      </div>
    </section>
  );
}

function CognitiveDepth({ snapshots }: { snapshots: LessonSnapshot[] }) {
  const total = Math.max(1, snapshots.length);
  const completionAt = (index: number) => Math.round((snapshots.filter((item) => item.progress.completed.length > index).length / total) * 100);
  const levels = [
    { label: "Predict", value: completionAt(0) },
    { label: "Mechanism", value: completionAt(1) },
    { label: "Explain", value: completionAt(2) },
    { label: "Implement", value: completionAt(3) },
    { label: "Transfer", value: completionAt(4) },
    { label: "Delayed", value: Math.round((snapshots.filter((item) => item.state === "mastered").length / total) * 100) },
  ].map((level) => ({ ...level, status: level.value >= 80 ? "complete" : level.value > 0 ? "current" : "future" }));
  return (
    <section className="template-card depth-card" aria-labelledby="depth-title">
      <h2 id="depth-title">Evidence Depth</h2>
      <p>Tỷ lệ lesson đã tạo được từng loại bằng chứng — không dùng số liệu trình diễn.</p>
      <div className="bloom-chart" aria-label="Bloom taxonomy progress">
        {levels.map((level) => (
          <div className="bloom-column" key={level.label}>
            <span>{level.status === "current" ? "Current" : `${level.value}%`}</span>
            <div className={`bloom-bar ${level.status}`} style={{ "--bloom-height": `${level.value}%` } as CSSProperties}><b>{level.label}</b></div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AspectAnalysis({ snapshots, onOpen }: { snapshots: LessonSnapshot[]; onOpen: () => void }) {
  const independent = snapshots.reduce((sum, item) => sum + item.evidence.firstAttemptIndependent, 0);
  const transfer = snapshots.filter((item) => item.progress.completed.length >= 5).length;
  const mastered = snapshots.filter((item) => item.state === "mastered").length;
  const activityTotal = Math.max(1, lessonCatalog.lessons.length * 5);
  const aspects = [
    { label: "Independent Evidence", score: `${independent}/${activityTotal}`, width: Math.round(independent / activityTotal * 100), tone: "emerald" },
    { label: "Transfer Completed", score: `${transfer}/14`, width: Math.round(transfer / 14 * 100), tone: "indigo" },
    { label: "Delayed Recall", score: `${mastered}/14`, width: Math.round(mastered / 14 * 100), tone: "slate" },
  ];
  return (
    <section className="template-card aspect-card" aria-labelledby="aspect-title">
      <h2 id="aspect-title">Aspect Analysis</h2>
      <div className="aspect-list">
        {aspects.map((aspect) => (
          <div className="aspect-row" key={aspect.label}>
            <div><span><i className={aspect.tone} />{aspect.label}</span><strong>{aspect.score}</strong></div>
            <div className="progress-track"><i className={aspect.tone} style={{ width: `${aspect.width}%` }} /></div>
          </div>
        ))}
      </div>
      <button className="outline-action" onClick={onOpen}>View Detailed Checklist</button>
    </section>
  );
}

function FeynmanBlock({ onStart }: { onStart: () => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <section className="hub-section" aria-labelledby="synthesis-title">
      <h2 className="hub-section-title" id="synthesis-title">✦ Daily Insight Synthesis</h2>
      <article className="feynman-block">
        <header>
          <div><span className="mono-label indigo-text">NEXT BEST ACTION · FEYNMAN TECHNIQUE</span><h3>Vector và dot product</h3></div>
          <span className="edit-mark" aria-hidden="true">↗</span>
        </header>
        <div className="feynman-copy">
          <p><strong>Simplified:</strong> Một prediction giống như tổng điểm của nhiều giám khảo. Mỗi feature đưa ra một “lá phiếu” bằng <code>xᵢ × wᵢ</code>, sau đó mô hình cộng tất cả lá phiếu lại.</p>
          <p>In short: <em>Dot product = tổng đóng góp có trọng số của các feature.</em></p>
          {expanded ? <p className="deep-copy">Bằng chứng còn thiếu: ông cần dự đoán chiều thay đổi của output, kiểm chứng bằng mô hình trực tiếp và chuyển cơ chế đó thành code.</p> : null}
        </div>
        <footer>
          <div><span>Math</span><span>Linear Models</span></div>
          <div className="feynman-actions"><button className="text-link" onClick={() => setExpanded(!expanded)}>{expanded ? "Collapse" : "Expand Deep-Dive"}</button><button className="primary-action" onClick={onStart}>Open Socratic Lab →</button></div>
        </footer>
      </article>
    </section>
  );
}

function ReviewQueue({ snapshots, expansionProgress, onStart, onExpansion, limit }: { snapshots: LessonSnapshot[]; expansionProgress: ExpansionProgress; onStart: (lessonId: string, activityId: string | null, mode: "practice" | "review") => void; onExpansion: (labId: ExpansionLabId, reviewDue: boolean) => void; limit?: number }) {
  const [now, setNow] = useState(0);
  useEffect(() => { queueMicrotask(() => setNow(Date.now())); }, []);
  const releaseZero = snapshots.filter((item) => item.state === "review_due" || item.state === "practiced").map((item) => ({
    id: item.lessonId, title: item.title, track: "R0", due: item.state === "review_due", dueAt: item.progress.review?.dueAt ?? (item.progress.practicedAt ? reviewDueAt(item.progress.practicedAt) : new Date(now + 72 * 3_600_000).toISOString()),
    onOpen: () => onStart(item.lessonId, null, item.state === "review_due" ? "review" : "practice"),
  }));
  const dueExpansionIds = new Set(dueExpansionReviews(expansionProgress, now));
  const expansion = expansionLabs.flatMap((lab) => {
    const review = expansionProgress.reviews[lab.id];
    if (!review || review.passedAt) return [];
    const due = dueExpansionIds.has(lab.id);
    return [{ id: lab.id, title: lab.title, track: expansionTracks.find((track) => track.id === lab.trackId)?.release ?? "R?", due, dueAt: review.dueAt, onOpen: () => onExpansion(lab.id, due) }];
  });
  const items = [...releaseZero, ...expansion].sort((left, right) => Number(right.due) - Number(left.due) || Date.parse(left.dueAt) - Date.parse(right.dueAt));
  const dueCount = items.filter((item) => item.due).length;
  const visible = limit ? items.slice(0, limit) : items;
  return (
    <section className="hub-section review-queue" aria-labelledby="review-queue-title">
      <div className="section-title-row"><div><span className="mono-label">R0 + R1 + R2 + R3 + R4 · SPACED REVIEW</span><h2 className="hub-section-title" id="review-queue-title">Delayed recall queue</h2></div><strong className={dueCount ? "queue-count due" : "queue-count"}>{dueCount} đến hạn</strong></div>
      {items.length ? <p className="review-queue-context">{dueCount} bài sẵn sàng ôn · {items.length - dueCount} bài đang chờ đủ 72 giờ. Bài chờ mở lại phần thực hành.</p> : null}
      {visible.length ? <div className="review-list">{visible.map((item) => { const hours = now ? Math.max(1, Math.ceil((Date.parse(item.dueAt) - now) / 3_600_000)) : 72; return <button key={`${item.track}:${item.id}`} onClick={item.onOpen}><span className={item.due ? "review-state due" : "review-state"}>{item.due ? "ÔN NGAY" : `${hours}H`}</span><span><small className="review-track">{item.track}</small><strong>{item.title}</strong><small>{item.due ? "Biến thể độc lập đã mở" : "Đang chờ khoảng cách trí nhớ"}</small></span><Icon name="arrow" /></button>; })}</div> : <div className="queue-empty"><strong>Chưa có bài trong hàng đợi.</strong><p>Hoàn thành R0 hoặc một lab R1/R2/R3/R4 để hệ thống đặt lịch ôn sau 72 giờ.</p></div>}
    </section>
  );
}

const repairReasonLabels: Record<RepairItem["reason"], string> = {
  copied_hint: "DỰNG LẠI",
  keyword_dump: "NỐI CƠ CHẾ",
  too_short: "ĐÀO SÂU",
  missing_concepts: "BÙ MẮT XÍCH",
  unlinked_concepts: "NỐI NHÂN QUẢ",
};

function RepairPracticeQueue({ items, onStart }: { items: RepairItem[]; onStart: (lessonId: string, activityId: string) => void }) {
  const visible = items.slice(0, 4);
  return (
    <section className="hub-section repair-practice" aria-labelledby="repair-practice-title">
      <div className="section-title-row">
        <div><span className="mono-label indigo-text">REPAIR LOOP · ONE BROKEN LINK AT A TIME</span><h2 className="hub-section-title" id="repair-practice-title">Hàng đợi sửa mental model</h2></div>
        <strong className={items.length ? "queue-count repair" : "queue-count"}>{items.length} cần sửa</strong>
      </div>
      <p className="repair-intro">Mỗi mục là một mắt xích cụ thể từng làm câu giải thích không đạt. Sửa đúng mắt xích này sẽ tự xóa mục khỏi hàng đợi.</p>
      {visible.length ? <div className="repair-list">{visible.map((item) => (
        <button key={item.id} onClick={() => onStart(item.lessonId, item.activityId)}>
          <span className={item.disputed ? "repair-state disputed" : "repair-state"}>{item.disputed ? "XEM LẠI" : repairReasonLabels[item.reason]}</span>
          <span><small>{item.lessonTitle} · {item.activityLabel}</small><strong>{item.title}</strong><p>{item.prompt}</p><em>{item.attempts} lần vướng · hint {item.hintLevel}/2</em></span>
          <Icon name="arrow" />
        </button>
      ))}</div> : <div className="queue-empty"><strong>Không có mắt xích nào đang nợ.</strong><p>Khi một lời giải chưa đạt, hệ thống sẽ đặt đúng câu hỏi sửa sai ở đây — không bắt ông học lại cả bài.</p></div>}
    </section>
  );
}

const historyEventLabels: Record<LocalLearningEvent["eventType"], string> = {
  diagnostic_completed: "Hoàn tất diagnostic",
  activity_attempt: "Trả lời hoạt động",
  hint_opened: "Mở hỗ trợ",
  code_run: "Chạy Python Code Lab",
  lesson_completed: "Hoàn tất lesson",
  delayed_review: "Ôn lại sau khoảng cách",
  scoring_dispute: "Đánh dấu chấm điểm cần xem lại",
  repair_created: "Tạo bài sửa mental model",
  repair_resolved: "Sửa xong mental model",
};

function historyLessonTitle(entry: LocalLearningEvent) {
  const releaseZeroTitle = lessonCatalog.lessons.find((lesson) => lesson.id === entry.lessonId)?.title;
  if (releaseZeroTitle) return releaseZeroTitle;
  if (entry.lessonId && isExpansionLabId(entry.lessonId)) return getExpansionLab(entry.lessonId).title;
  return "Learning diagnostic";
}

function historyOutcome(entry: LocalLearningEvent) {
  if (entry.outcome === "pass" || entry.outcome === "completed") return "Đạt";
  if (entry.outcome === "fail") return "Cần sửa";
  if (entry.outcome === "timeout") return "Quá thời gian";
  if (entry.outcome === "runtime_error") return "Lỗi runtime";
  if (entry.outcome === "opened") return `Hỗ trợ ${entry.hintLevel ?? 0}/2`;
  return "Đã ghi nhận";
}

function RecentDialogues({ entries, onStart, onHistory }: { entries: LocalLearningEvent[]; onStart: (lessonId: string) => void; onHistory: () => void }) {
  const recent = entries.filter((entry) => entry.lessonId).slice(0, 3);
  return (
    <section className="hub-section recent-section" aria-labelledby="recent-title">
      <div className="section-title-row"><h2 className="hub-section-title" id="recent-title">Recent Socratic Dialogues</h2><button className="quiet-link" onClick={onHistory}>View History →</button></div>
      {recent.length ? <div className="recent-list">
        {recent.map((entry, index) => (
          <button className="recent-row" key={entry.id} onClick={() => onStart(entry.lessonId ?? "vectors")}>
            <span className={index === 0 ? "recent-icon active" : "recent-icon"}><Icon name="brain" /></span>
            <span><strong>{historyLessonTitle(entry)}</strong><small suppressHydrationWarning>{historyEventLabels[entry.eventType]} · {new Date(entry.occurredAt).toLocaleString("vi-VN")}</small></span>
            <span className="exchange"><small>Evidence</small><b>{historyOutcome(entry)}</b></span><Icon name="arrow" />
          </button>
        ))}
      </div> : <div className="queue-empty"><strong>Chưa có lịch sử học thật.</strong><p>Hoàn thành một hoạt động; dấu vết học sẽ xuất hiện tại đây trên thiết bị này.</p></div>}
    </section>
  );
}

function SourceCourseHub({ onLibrary, onCreate }: { onLibrary: () => void; onCreate: () => void }) {
  return <section className="source-hub" aria-labelledby="source-hub-title"><div><h2 id="source-hub-title">Học theo lộ trình của ông</h2><p>Mở khóa học đã lưu hoặc tạo bài học từ một nguồn mới.</p></div><div className="course-onward"><button className="outline-action" onClick={onLibrary}>Mở thư viện →</button><button className="primary-action" onClick={onCreate}>Tạo khóa học →</button></div></section>;
}

function SourceReviews({ onOpen }: { onOpen: (courseId: string, lessonId: string) => void }) {
  const [result, setResult] = useState<SourceCoursesReadResult | null>(null);
  const courses = result?.courses ?? null;
  const [now, setNow] = useState(0);
  useEffect(() => {
    queueMicrotask(() => { setResult(readSourceCourses(() => window.localStorage)); setNow(Date.now()); });
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const reviews = (courses ?? []).flatMap((course) => course.lessons
    .filter((lesson) => lesson.completedAt && lesson.reviewDueAt && !lesson.reviewedAt)
    .map((lesson) => ({ course, lesson })))
    .sort((left, right) => Date.parse(left.lesson.reviewDueAt!) - Date.parse(right.lesson.reviewDueAt!));
  return <section className="review-queue source-reviews" aria-labelledby="source-reviews-title"><div className="section-title-row"><h2 id="source-reviews-title">Ôn từ nguồn đã lưu</h2>{courses !== null ? <strong className="queue-count">{reviews.filter(({ lesson }) => Date.parse(lesson.reviewDueAt!) <= now).length} đến hạn</strong> : null}</div>{reviews.length ? <p className="review-queue-context">{reviews.filter(({ lesson }) => Date.parse(lesson.reviewDueAt!) > now).length} bài đang chờ đủ 72 giờ · Mỗi bài giữ đúng khóa học và đoạn nguồn.</p> : null}{result?.error ? <div className="source-review-warning"><p role="alert">{result.error}</p><button className="outline-action" onClick={() => { setResult(readSourceCourses(() => window.localStorage)); setNow(Date.now()); }}>Thử đọc lại</button></div> : courses === null ? <p role="status">Đang đọc các khóa học trên thiết bị…</p> : reviews.length ? <div className="review-list">{reviews.map(({ course, lesson }) => <button key={`${course.id}:${lesson.id}`} onClick={() => onOpen(course.id, lesson.id)}><span className={Date.parse(lesson.reviewDueAt!) <= now ? "review-state due" : "review-state"}>{Date.parse(lesson.reviewDueAt!) <= now ? "ÔN NGAY" : "CHỜ 72H"}</span><span><small>{course.title}</small><strong>{lesson.title}</strong><small>{Date.parse(lesson.reviewDueAt!) <= now ? "Biến thể theo đoạn nguồn đã mở" : `Mở sau ${new Date(lesson.reviewDueAt!).toLocaleString("vi-VN")}`}</small></span><Icon name="arrow" /></button>)}</div> : <div className="queue-empty"><strong>Chưa có bài ôn từ nguồn.</strong><p>Học một bài trong thư viện để đặt lịch ôn sau 72 giờ.</p></div>}</section>;
}

function HubView({ adaptive, snapshots, expansionProgress, repairs, history, diagnostic, onDiagnostic, onStart, onAdaptiveLesson, onExpansion, onRecent, onRepair, onMap, onChecklist, onHistory, onStudio, onLibrary }: { adaptive: AdaptiveHubState; snapshots: LessonSnapshot[]; expansionProgress: ExpansionProgress; repairs: RepairItem[]; history: LocalLearningEvent[]; diagnostic: DiagnosticResult | null; onDiagnostic: () => void; onStart: (lessonId: string) => void; onAdaptiveLesson: (lessonId: string, activityId: string | null, mode: "practice" | "review") => void; onExpansion: (labId: ExpansionLabId, reviewDue: boolean, edgeId?: ExpansionEdgeId) => void; onRecent: (lessonId: string) => void; onRepair: (lessonId: string, activityId: string) => void; onMap: () => void; onChecklist: () => void; onHistory: () => void; onStudio: (courseId?: string, lessonId?: string) => void; onLibrary: () => void }) {
  return (
    <div className="hub-canvas">
      <header className="template-page-header"><h1>Hôm nay</h1><p>Một bài để bắt đầu. Phần còn lại có thể xem khi cần.</p></header>
      <AdaptiveHub state={adaptive} onLesson={onAdaptiveLesson} onExpansion={onExpansion} onDiagnostic={onDiagnostic} />
      {adaptive.hydrated ? <>
        <details className="home-analytics"><summary>Xem hàng ôn và chủ đề khác</summary><div className="home-focus-grid">
          <ReviewQueue snapshots={snapshots} expansionProgress={expansionProgress} onStart={onAdaptiveLesson} onExpansion={onExpansion} limit={3} />
          <ActiveTopics snapshots={snapshots} recommendedLessonId={adaptive.queue.items[0]?.target?.kind === "lesson" ? adaptive.queue.items[0].target.id : diagnostic?.recommendedLessonId} onStart={onStart} onMap={onMap} />
        </div>
        </details>
        <SourceCourseHub onLibrary={onLibrary} onCreate={() => onStudio()} />
        <details className="home-analytics"><summary>Tiến độ và công cụ học tập</summary>
          <DiagnosticSummary result={diagnostic} onOpen={onDiagnostic} onStart={onStart} />
          <div className="dashboard-grid"><CognitiveDepth snapshots={snapshots} /><AspectAnalysis snapshots={snapshots} onOpen={onChecklist} /></div>
          <RepairPracticeQueue items={repairs} onStart={onRepair} />
          <FeynmanBlock onStart={() => onStart("vectors")} />
          <RecentDialogues entries={history} onStart={onRecent} onHistory={onHistory} />
        </details>
      </> : null}
    </div>
  );
}

function DiagnosticView({ previousResult, onComplete, onClose, onStart }: { previousResult: DiagnosticResult | null; onComplete: (result: DiagnosticResult) => void; onClose: () => void; onStart: (lessonId: string) => void }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<DiagnosticResult | null>(previousResult);
  const question = diagnosticCatalog.questions[index];
  const answer = question ? answers[question.id] : undefined;

  const finish = () => {
    const next = scoreDiagnostic(answers);
    setResult(next);
    onComplete(next);
  };
  const restart = () => {
    setAnswers({});
    setIndex(0);
    setResult(null);
  };

  if (result) {
    const recommended = getLesson(result.recommendedLessonId);
    const bandCopy = result.band === "foundation" ? "Xây nền có chủ đích" : result.band === "building" ? "Đang kết nối các mảnh kiến thức" : "Sẵn sàng cho bài tích hợp";
    return (
      <div className="diagnostic-canvas">
        <button className="back-link diagnostic-back" onClick={onClose}>← Learning Hub</button>
        <section className="diagnostic-result">
          <header><span className="mono-label">BASELINE RECORDED</span><strong>{result.score}/{result.total}</strong><h1>{bandCopy}</h1><p>Điểm này chỉ chọn lộ trình, không được tính là bằng chứng mastery.</p></header>
          <div className="diagnostic-axis-grid">
            {(Object.keys(diagnosticAxisLabels) as DiagnosticAxis[]).map((axis) => { const value = result.axisScores[axis]; const percent = Math.round(value.correct / value.total * 100); return <article key={axis}><div><span>{diagnosticAxisLabels[axis]}</span><strong>{value.correct}/{value.total}</strong></div><div className="progress-track"><i className={percent === 100 ? "emerald" : percent > 0 ? "indigo" : "slate"} style={{ width: `${percent}%` }} /></div></article>; })}
          </div>
          <aside className="diagnostic-recommendation"><span className="mono-label">EARLIEST KNOWLEDGE GAP</span><h2>{recommended.title}</h2><p>{recommended.mechanism}</p><button className="primary-action" onClick={() => onStart(recommended.id)}>Bắt đầu bài đề xuất →</button></aside>
          <footer><button className="text-link" onClick={restart}>Làm lại diagnostic</button><button className="outline-action" onClick={onClose}>Quay lại Hub</button></footer>
        </section>
      </div>
    );
  }

  return (
    <div className="diagnostic-canvas">
      <button className="back-link diagnostic-back" onClick={onClose}>← Learning Hub</button>
      <section className="diagnostic-panel">
        <header><div><span className="mono-label">FOUNDATION DIAGNOSTIC</span><h1>{diagnosticCatalog.title}</h1></div><strong>{index + 1}/{diagnosticCatalog.questions.length}</strong></header>
        <div className="diagnostic-progress"><i style={{ width: `${(index + 1) / diagnosticCatalog.questions.length * 100}%` }} /></div>
        <div className="diagnostic-question"><span>{diagnosticAxisLabels[question.axis]}</span><h2>{question.prompt}</h2><div className="diagnostic-options">{question.options.map((option, optionIndex) => <button aria-pressed={answer === optionIndex} className={answer === optionIndex ? "selected" : ""} key={option} onClick={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))}><span>{String.fromCharCode(65 + optionIndex)}</span>{option}</button>)}</div></div>
        <footer><button className="outline-action" disabled={index === 0} onClick={() => setIndex((current) => Math.max(0, current - 1))}>← Câu trước</button><button className="primary-action" disabled={answer === undefined} onClick={() => index === diagnosticCatalog.questions.length - 1 ? finish() : setIndex((current) => current + 1)}>{index === diagnosticCatalog.questions.length - 1 ? "Hoàn tất diagnostic" : "Câu tiếp theo →"}</button></footer>
      </section>
    </div>
  );
}

function DotProductModel() {
  const [weight, setWeight] = useState(0.5);
  const prediction = 2 - 2 + 3 * weight;
  const rows = [
    { name: "x₁", expression: "2 × 1", value: 2, tone: "emerald" },
    { name: "x₂", expression: "−1 × 2", value: -2, tone: "slate" },
    { name: "x₃", expression: `3 × ${weight.toFixed(1)}`, value: 3 * weight, tone: "indigo" },
  ];
  return (
    <section className="live-model" aria-labelledby="live-model-title">
      <header><div><span className="mono-label">LIVE MODEL</span><h3 id="live-model-title">Feature contributions</h3></div><span className="running-dot">● Running</span></header>
      <div className="contribution-list">
        {rows.map((row) => <div className="contribution-row" key={row.name}><strong>{row.name}</strong><span>{row.expression}</span><div><i className={row.tone} style={{ width: `${Math.min(100, Math.abs(row.value) * 15 + 8)}%` }} /></div><output>{row.value.toFixed(1)}</output></div>)}
      </div>
      <div className="model-output"><span>ŷ = x · w</span><strong>{prediction.toFixed(1)}</strong></div>
      <label htmlFor="weight-control"><span><strong>Thử thay w₃</strong><small>x₃ đang cố định ở 3</small></span><output>{weight.toFixed(1)}</output></label>
      <input id="weight-control" type="range" min="-2" max="3" step="0.5" value={weight} onChange={(event) => setWeight(Number(event.target.value))} />
      <div className="range-labels"><span>−2</span><span>0</span><span>3</span></div>
      <p className="guided-discovery"><strong>Thử thách:</strong> kéo w₃ để ŷ = 0. Quan sát contribution nào phải triệt tiêu tổng của hai feature đầu.</p>
    </section>
  );
}

function DataLensLab({ lessonId }: { lessonId: string }) {
  const [missing, setMissing] = useState(18);
  const [noise, setNoise] = useState(12);
  const observed = 100 - missing;
  const reliable = Math.round(observed * (100 - noise) / 100);
  const question = lessonId === "problem-frame"
    ? "Nếu label chỉ là proxy nhiễu, model đang tối ưu mục tiêu thật hay tối ưu thứ dễ đo?"
    : lessonId === "data-feature-label"
      ? "Feature có nhiều không đồng nghĩa có nhiều signal. Phần nào thật sự giúp dự đoán label?"
      : "Tăng missing và noise: đến lúc nào dữ liệu còn nhiều nhưng bằng chứng hữu ích đã quá ít?";
  return (
    <section className="mechanism-lab data-lens" aria-labelledby="data-lens-title">
      <header><div><span className="mono-label">DATA LENS · REACTIVE SAMPLE</span><h3 id="data-lens-title">100 rows không có nghĩa là 100 bằng chứng</h3></div><output>{reliable}% signal</output></header>
      <div className="sample-grid" aria-label={`${reliable} ô có signal đáng tin, ${missing} ô bị thiếu và ${100 - missing - reliable} ô nhiễu`}>
        {Array.from({ length: 100 }, (_, index) => <i key={index} className={index < reliable ? "reliable" : index < observed ? "noisy" : "missing"} />)}
      </div>
      <div className="lab-controls two-controls">
        <label htmlFor="r0-missing"><span>Missing rows <output>{missing}%</output></span><input id="r0-missing" type="range" min="0" max="60" value={missing} onChange={(event) => setMissing(Number(event.target.value))} /></label>
        <label htmlFor="r0-noise"><span>Label noise <output>{noise}%</output></span><input id="r0-noise" type="range" min="0" max="60" value={noise} onChange={(event) => setNoise(Number(event.target.value))} /></label>
      </div>
      <div className="representation-strip"><span><i className="reliable" />Signal {reliable}</span><span><i className="noisy" />Nhiễu {observed - reliable}</span><span><i className="missing" />Thiếu {missing}</span></div>
      <p className="guided-discovery"><strong>Câu hỏi dẫn đường:</strong> {question}</p>
    </section>
  );
}

function FunctionMachine() {
  const [input, setInput] = useState(2);
  const [scale, setScale] = useState(1.5);
  const [bias, setBias] = useState(-1);
  const output = input * scale + bias;
  return (
    <section className="mechanism-lab function-machine" aria-labelledby="function-machine-title">
      <header><div><span className="mono-label">FUNCTION MACHINE · SAME RULE, NEW INPUT</span><h3 id="function-machine-title">f(x) = ax + b</h3></div><output>{output.toFixed(1)}</output></header>
      <div className="machine-flow">
        <article><span>INPUT</span><strong>{input.toFixed(1)}</strong></article><i>→</i>
        <article className="rule-card"><span>RULE</span><strong>× {scale.toFixed(1)} {bias < 0 ? "−" : "+"} {Math.abs(bias).toFixed(1)}</strong></article><i>→</i>
        <article><span>OUTPUT</span><strong>{output.toFixed(1)}</strong></article>
      </div>
      <svg className="function-plot" viewBox="0 0 280 130" role="img" aria-label={`Đường hàm số đi qua điểm đầu vào ${input.toFixed(1)}, đầu ra ${output.toFixed(1)}`}>
        <path className="axis" d="M20 65H260M140 10V120" />
        <line className="model-line" x1="40" y1={65 - (-5 * scale + bias) * 8} x2="240" y2={65 - (5 * scale + bias) * 8} />
        <circle className="focus-point" cx={140 + input * 20} cy={65 - output * 8} r="6" />
      </svg>
      <div className="lab-controls three-controls">
        <label htmlFor="r0-input"><span>Input x <output>{input.toFixed(1)}</output></span><input id="r0-input" type="range" min="-4" max="4" step="0.5" value={input} onChange={(event) => setInput(Number(event.target.value))} /></label>
        <label htmlFor="r0-scale"><span>Scale a <output>{scale.toFixed(1)}</output></span><input id="r0-scale" type="range" min="-2" max="3" step="0.5" value={scale} onChange={(event) => setScale(Number(event.target.value))} /></label>
        <label htmlFor="r0-bias"><span>Bias b <output>{bias.toFixed(1)}</output></span><input id="r0-bias" type="range" min="-3" max="3" step="0.5" value={bias} onChange={(event) => setBias(Number(event.target.value))} /></label>
      </div>
      <p className="guided-discovery"><strong>Thử thách:</strong> giữ output không đổi trong khi thay input. Ông phải bù bằng scale hay bias như thế nào?</p>
    </section>
  );
}

function ErrorLab({ mode }: { mode: "residual" | "mse" }) {
  const [slope, setSlope] = useState(0.8);
  const [intercept, setIntercept] = useState(0.6);
  const points = [[1, 1.7], [2, 2.9], [3, 3.1], [4, 5.4], [5, 4.8]];
  const residuals = points.map(([x, y]) => y - (slope * x + intercept));
  const mse = residuals.reduce((sum, value) => sum + value * value, 0) / residuals.length;
  const sx = (value: number) => 24 + value * 42;
  const sy = (value: number) => 152 - value * 22;
  return (
    <section className="mechanism-lab error-lab" aria-labelledby="error-lab-title">
      <header><div><span className="mono-label">ERROR LAB · LINKED REPRESENTATIONS</span><h3 id="error-lab-title">{mode === "mse" ? "Từ từng residual đến MSE" : "Residual là khoảng model đoán sai"}</h3></div><output>MSE {mse.toFixed(2)}</output></header>
      <svg className="error-plot" viewBox="0 0 270 170" role="img" aria-label={`Biểu đồ năm điểm dữ liệu, đường dự đoán và residual; MSE ${mse.toFixed(2)}`}>
        <path className="axis" d="M24 12V152H252" />
        <line className="model-line" x1={sx(0)} y1={sy(intercept)} x2={sx(5.4)} y2={sy(slope * 5.4 + intercept)} />
        {points.map(([x, y], index) => <g key={`${x}-${y}`}><line className="residual-line" x1={sx(x)} x2={sx(x)} y1={sy(y)} y2={sy(slope * x + intercept)} /><circle className="data-point" cx={sx(x)} cy={sy(y)} r="5" /><circle className="prediction-point" cx={sx(x)} cy={sy(slope * x + intercept)} r="3" /><text x={sx(x) + 6} y={(sy(y) + sy(slope * x + intercept)) / 2}>{residuals[index].toFixed(1)}</text></g>)}
      </svg>
      <div className="residual-row">{residuals.map((value, index) => <div key={index}><span>r{index + 1}</span><i style={{ height: `${Math.min(56, Math.abs(value) * 25 + 3)}px` }} /><strong>{value.toFixed(1)}</strong></div>)}</div>
      <div className="lab-controls two-controls">
        <label htmlFor="r0-slope"><span>Slope w <output>{slope.toFixed(1)}</output></span><input id="r0-slope" type="range" min="0" max="1.6" step="0.1" value={slope} onChange={(event) => setSlope(Number(event.target.value))} /></label>
        <label htmlFor="r0-intercept"><span>Intercept b <output>{intercept.toFixed(1)}</output></span><input id="r0-intercept" type="range" min="-1" max="3" step="0.1" value={intercept} onChange={(event) => setIntercept(Number(event.target.value))} /></label>
      </div>
      <p className="guided-discovery"><strong>Thử thách:</strong> hạ MSE xuống dưới 0.35. Residual lớn bị bình phương nên tác động mạnh đến mức nào?</p>
    </section>
  );
}

function GradientLab({ lessonId }: { lessonId: string }) {
  const [learningRate, setLearningRate] = useState(0.2);
  const [steps, setSteps] = useState(4);
  const positions = [4];
  for (let index = 0; index < steps; index += 1) positions.push(positions.at(-1)! - learningRate * 2 * positions.at(-1)!);
  const current = positions.at(-1)!;
  const status = Math.abs(current) < 0.15 ? "Đã hội tụ" : learningRate >= 1 ? "Dao động / phân kỳ" : "Đang tiến về cực tiểu";
  const curve = Array.from({ length: 41 }, (_, index) => -5 + index * 0.25).map((x) => `${135 + x * 22},${150 - x * x * 5}`).join(" ");
  const path = positions.map((x) => `${135 + Math.max(-5, Math.min(5, x)) * 22},${150 - Math.min(25, x * x) * 5}`).join(" ");
  return (
    <section className="mechanism-lab gradient-lab" aria-labelledby="gradient-lab-title">
      <header><div><span className="mono-label">GRADIENT DESCENT · STEP BY STEP</span><h3 id="gradient-lab-title">{lessonId === "derivative" ? "Đạo hàm chỉ hướng dốc" : "Learning rate quyết định độ dài bước"}</h3></div><output className={learningRate >= 1 ? "danger" : ""}>{status}</output></header>
      <svg className="gradient-plot" viewBox="0 0 270 165" role="img" aria-label={`Quỹ đạo gradient descent sau ${steps} bước, x hiện tại ${current.toFixed(2)}`}>
        <polyline className="loss-curve" points={curve} />
        <polyline className="descent-path" points={path} />
        {positions.map((x, index) => <g key={index}><circle className={index === positions.length - 1 ? "current-step" : "past-step"} cx={135 + Math.max(-5, Math.min(5, x)) * 22} cy={150 - Math.min(25, x * x) * 5} r={index === positions.length - 1 ? 6 : 3} /><text x={135 + Math.max(-5, Math.min(5, x)) * 22 + 6} y={145 - Math.min(25, x * x) * 5}>{index}</text></g>)}
      </svg>
      <div className="gradient-equation"><span>x ← x − η · 2x</span><strong>x = {current.toFixed(3)}</strong><small>loss = {(current * current).toFixed(3)}</small></div>
      <div className="lab-controls"><label htmlFor="r0-learningRate"><span>Learning rate η <output>{learningRate.toFixed(2)}</output></span><input id="r0-learningRate" type="range" min="0.05" max="1.2" step="0.05" value={learningRate} onChange={(event) => setLearningRate(Number(event.target.value))} /></label></div>
      <div className="step-actions"><button className="outline-action" onClick={() => setSteps(0)}>Reset</button><button className="primary-action" onClick={() => setSteps((value) => Math.min(12, value + 1))}>Đi thêm 1 bước →</button></div>
      <p className="guided-discovery"><strong>Thử thách:</strong> tìm learning rate hội tụ nhanh nhưng không bật qua lại. Sau đó kéo η vượt 1 để thấy cơ chế phân kỳ.</p>
    </section>
  );
}

function ValidationLab() {
  const [complexity, setComplexity] = useState(5);
  const values = Array.from({ length: 10 }, (_, index) => {
    const level = index + 1;
    return { level, train: Math.max(8, 78 - level * 7), validation: Math.min(94, 42 + (level - 5) ** 2 * 2) };
  });
  const selected = values[complexity - 1];
  const region = complexity <= 3 ? "Underfitting" : complexity <= 6 ? "Useful capacity" : "Overfitting";
  const plot = (key: "train" | "validation") => values.map((item) => `${25 + item.level * 22},${145 - item[key] * 1.2}`).join(" ");
  return (
    <section className="mechanism-lab validation-lab" aria-labelledby="validation-lab-title">
      <header><div><span className="mono-label">GENERALIZATION LAB · TRAIN ≠ TEST</span><h3 id="validation-lab-title">Model phức tạp hơn không luôn tốt hơn</h3></div><output className={region === "Overfitting" ? "danger" : ""}>{region}</output></header>
      <svg className="validation-plot" viewBox="0 0 270 165" role="img" aria-label={`Độ phức tạp ${complexity}, train error ${selected.train}, validation error ${selected.validation}`}>
        <path className="axis" d="M25 18V145H252" />
        <polyline className="train-curve" points={plot("train")} />
        <polyline className="validation-curve" points={plot("validation")} />
        <line className="complexity-marker" x1={25 + complexity * 22} x2={25 + complexity * 22} y1="18" y2="145" />
        <circle className="train-point" cx={25 + complexity * 22} cy={145 - selected.train * 1.2} r="5" />
        <circle className="validation-point" cx={25 + complexity * 22} cy={145 - selected.validation * 1.2} r="5" />
      </svg>
      <div className="curve-legend"><span><i className="train" />Train error {selected.train}%</span><span><i className="validation" />Validation error {selected.validation}%</span><strong>Gap {Math.abs(selected.validation - selected.train)} điểm</strong></div>
      <div className="lab-controls"><label htmlFor="r0-complexity"><span>Model complexity <output>{complexity}/10</output></span><input id="r0-complexity" type="range" min="1" max="10" value={complexity} onChange={(event) => setComplexity(Number(event.target.value))} /></label></div>
      <p className="guided-discovery"><strong>Thử thách:</strong> tìm vùng validation error thấp nhất. Vì sao train error vẫn giảm khi model bắt đầu overfit?</p>
    </section>
  );
}

function EvidenceSummary({ progress, total }: { progress: LessonProgress; total: number }) {
  const finished = progress.completed.length === total;
  const hintsUsed = Object.values(progress.hintLevels).reduce((sum, level) => sum + (level ?? 0), 0);
  const attempts = Object.values(progress.attempts).reduce((sum, count) => sum + (count ?? 0), 0);
  const score = lessonEvidenceScore(progress, total);
  const state = masteryState(progress, total);
  return (
    <section className={finished ? "evidence-summary complete" : "evidence-summary"} aria-label="Tổng kết bằng chứng">
      <span className="mono-label">EVIDENCE LEDGER</span>
      <h3>{finished ? "Đã đủ bằng chứng luyện tập" : `${progress.completed.length}/${total} bằng chứng đã ghi`}</h3>
      <div><span>Hoạt động</span><strong>{progress.completed.length}/{total}</strong></div>
      <div><span>Lần thử</span><strong>{attempts}</strong></div>
      <div><span>Gợi ý đã dùng</span><strong>{hintsUsed}</strong></div>
      <div><span>Evidence score</span><strong>{score}%</strong></div>
      <p>{finished ? `Trạng thái: ${masteryLabel(state)}. Mastery chỉ mở sau bài ôn độc lập ≥ 72 giờ.` : "Hoàn thành từng bước để mở bài chuyển giao."}</p>
    </section>
  );
}

function ConceptInstrument({ lesson }: { lesson: LessonContent }) {
  if (["problem-frame", "data-feature-label", "data-quality"].includes(lesson.id)) return <DataLensLab lessonId={lesson.id} />;
  if (lesson.id === "functions") return <FunctionMachine />;
  if (["vectors", "linear-model"].includes(lesson.id)) return <DotProductModel />;
  if (["residual", "mse"].includes(lesson.id)) return <ErrorLab mode={lesson.id as "residual" | "mse"} />;
  if (["derivative", "gradient", "learning-rate", "from-scratch"].includes(lesson.id)) return <GradientLab lessonId={lesson.id} />;
  return <ValidationLab />;
}

type ClinicCard = { counterexample: string; question: string; options: string[]; correctIndex: number; explanation: string };

function RepairClinic({ card, focus, passed, onPass }: { card: ClinicCard; focus: string; passed: boolean; onPass: () => void }) {
  const [choice, setChoice] = useState<number | null>(null);
  const [tried, setTried] = useState(false);
  const check = () => {
    if (gradeClinicChoice(card, choice)) onPass();
    else setTried(true);
  };
  return <section className="repair-clinic" aria-labelledby="repair-clinic-title">
    <span className="mono-label">ERROR CLINIC · SỬA MỘT MẮT XÍCH</span>
    <h3 id="repair-clinic-title">Thử một phản ví dụ trước khi giải thích lại</h3>
    <p className="repair-clinic-focus">Điểm cần sửa: {focus}</p>
    <div className="repair-clinic-example"><strong>Phản ví dụ</strong><p>{card.counterexample}</p></div>
    <p className="repair-clinic-question">{card.question}</p>
    <div className="repair-clinic-options" role="group" aria-label="Bài kiểm tra biến thể">
      {card.options.map((option, index) => <button key={option} type="button" disabled={passed} aria-pressed={choice === index} className={choice === index ? "selected" : ""} onClick={() => { setChoice(index); setTried(false); }}>{option}</button>)}
    </div>
    {passed ? <p className="repair-clinic-result" role="status">Đúng. {card.explanation} Bây giờ viết lại lời giải gốc bằng ví dụ riêng; chỉ phần đó mới xóa mục cần sửa.</p> : <><button className="outline-action" type="button" disabled={choice === null} onClick={check}>Kiểm tra phản ví dụ</button>{tried ? <p className="repair-clinic-result" role="status">Chưa đúng. So sánh điều gì thay đổi trong phản ví dụ rồi thử lại.</p> : null}</>}
  </section>;
}

function SocraticLab({ lessonId, targetActivityId, initialMode, repairItem, returnLabel, onClose }: { lessonId: string; targetActivityId?: string | null; initialMode: "practice" | "review"; repairItem?: RepairItem | null; returnLabel: string; onClose: () => void }) {
  const lesson = getLesson(lessonId);
  const reviewActivity = getReview(lessonId);
  const pythonLab = getPythonLab(lessonId);
  const [progress, setProgress] = useState<LessonProgress>(initialLessonProgress);
  const [restored, setRestored] = useState(false);
  const [choice, setChoice] = useState<number | null>(null);
  const [reviewChoice, setReviewChoice] = useState<number | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState<string | null>(null);
  const [response, setResponse] = useState("");
  const firstCode = lesson.activities.find((activity) => activity.input.kind === "code");
  const [code, setCode] = useState(firstCode?.input.kind === "code" ? firstCode.input.starter : "");
  const [feedback, setFeedback] = useState<ActivityFeedback | null>(null);
  const [disputeSent, setDisputeSent] = useState(false);
  const [pythonRun, setPythonRun] = useState<PythonRunResult | null>(null);
  const [runnerPhase, setRunnerPhase] = useState<RunnerPhase | null>(null);
  const codeEditorRef = useRef<HTMLTextAreaElement>(null);
  const stageStartedAt = useRef(0);
  const outlineRef = useRef<HTMLDetailsElement>(null);
  const supportRef = useRef<HTMLDetailsElement>(null);
  const workspaceHeading = useRef<HTMLHeadingElement>(null);
  const activityHeading = useRef<HTMLHeadingElement>(null);
  const lastFocusContext = useRef<{ key: string; independent: boolean } | null>(null);
  useEffect(() => {
    if (window.matchMedia("(max-width: 900px)").matches) {
      if (outlineRef.current) outlineRef.current.open = false;
      if (supportRef.current) supportRef.current.open = false;
    }
    workspaceHeading.current?.focus({ preventScroll: true });
  }, []);

  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [retryActivityId, setRetryActivityId] = useState<string | null>(null);
  const [retryHints, setRetryHints] = useState(0);
  const [clinicPassed, setClinicPassed] = useState(false);
  const [clinicRetestDone, setClinicRetestDone] = useState(false);
  const stage = lesson.activities[Math.min(progress.currentIndex, lesson.activities.length - 1)] ?? lesson.activities[0];
  const clinicCard = repairItem?.activityId === stage.id && targetActivityId === stage.id && stage.input.kind === "text" ? clinicForRepair(stage.id) as ClinicCard | null : null;
  const stageComplete = progress.completed.includes(stage.id) && retryActivityId !== stage.id && (!clinicCard || clinicRetestDone);
  const lessonComplete = progress.completed.length === lesson.activities.length;
  const hintLevel = retryActivityId === stage.id ? retryHints : progress.hintLevels[stage.id] ?? 0;
  const codeCoach = getCodeCoach(lesson.id);
  const codeActivityIndex = lesson.activities.findIndex((activity) => activity.input.kind === "code");
  const codeActivity = lesson.activities[codeActivityIndex];
  const codeEvidence = codeActivity ? progress.activityEvidence[codeActivity.id] : null;
  const codeIndependent = Boolean(codeEvidence && (codeEvidence.hintsUsed === 0 || codeEvidence.independentAt));
  const standardIndependent = lesson.activities.slice(0, 2).every((activity) => (progress.activityEvidence[activity.id]?.hintsUsed ?? progress.hintLevels[activity.id] ?? 0) === 0 || Boolean(progress.activityEvidence[activity.id]?.independentAt));
  const currentMastery = !standardIndependent ? "practicing" : masteryState(progress, lesson.activities.length, new Date(), lesson.activities.map((activity) => activity.id));
  const reviewSubmitDisabled = reviewChoice === null || currentMastery === "mastered";
  const reviewHours = hoursUntilReview(progress);
  const storageKey = `briliantai.lesson.${lesson.id}.progress.v3`;
  const legacyStorageKey = `briliantai.lesson.${lesson.id}.progress.v2`;

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = window.localStorage.getItem(storageKey) ?? window.localStorage.getItem(legacyStorageKey);
        if (saved) {
          const normalized = normalizeProgress(JSON.parse(saved), lesson.activities.length, new Date(), lesson.activities.map((activity) => activity.id));
          const targetIndex = targetActivityId
            ? lesson.activities.findIndex((activity) => activity.id === targetActivityId)
            : initialMode === "review"
              ? lesson.activities.length - 1
              : -1;
          setProgress(targetIndex >= 0 ? { ...normalized, currentIndex: targetIndex } : normalized);
        }
      } catch {
        // Progress remains available for the current session when storage is unavailable.
      }
      setRestored(true);
    });
  }, [initialMode, legacyStorageKey, lesson.activities, storageKey, targetActivityId]);

  useEffect(() => {
    if (!restored) return;
    const warning = persistLessonProgress(() => window.localStorage, storageKey, progress);
    if (warning) queueMicrotask(() => setStorageWarning(warning));
  }, [progress, restored, storageKey]);

  useEffect(() => {
    stageStartedAt.current = monotonicNow();
  }, [stage.id]);

  const recordAttempt = (correct: boolean, message: string, criteria?: Array<{ id: string; label: string; passed: boolean }>, coach?: ExplanationCoach, repairQueued = false) => {
    const isNewEvidence = correct && !progress.completed.includes(stage.id);
    const completesLesson = isNewEvidence && progress.completed.length + 1 === lesson.activities.length;
    recordLearningEvent({
      eventType: "activity_attempt",
      lessonId: lesson.id,
      activityId: stage.id,
      outcome: correct ? "pass" : "fail",
      hintLevel,
      durationMs: monotonicNow() - stageStartedAt.current,
    });
    if (completesLesson) recordLearningEvent({ eventType: "lesson_completed", lessonId: lesson.id, outcome: "completed" });
    setProgress((current) => recordLessonAttempt(current, stage.id, correct, lesson.activities.length, hintLevel, new Date(), lesson.activities.map((activity) => activity.id)));
    if (correct) setRetryActivityId(null);
    setFeedback({ correct, message, criteria, coach, repairQueued });
  };

  const checkReview = () => {
    if (reviewChoice === null) return;
    const recallCorrect = reviewChoice === reviewActivity.correctIndex;
    const correct = recallCorrect && codeIndependent && standardIndependent;
    recordLearningEvent({
      eventType: "delayed_review",
      lessonId: lesson.id,
      activityId: `${lesson.id}-delayed-review`,
      outcome: recallCorrect ? "pass" : "fail",
      durationMs: monotonicNow() - stageStartedAt.current,
    });
    setProgress((current) => ({
      ...current,
      review: {
        dueAt: current.review?.dueAt ?? reviewDueAt(current.practicedAt ?? new Date().toISOString()),
        attempts: (current.review?.attempts ?? 0) + 1,
        completedAt: correct ? new Date().toISOString() : current.review?.completedAt ?? null,
        correct: correct || current.review?.correct === true,
      },
    }));
    setReviewFeedback(
      correct
        ? reviewActivity.explanation
        : recallCorrect
          ? "Recall đã đúng, nhưng còn thiếu thực hành độc lập. Dùng nút làm lại độc lập; một lần đạt sẽ mở lịch ôn mới sau 72 giờ."
          : "Chưa đúng. Hãy suy luận lại từ cơ chế thay vì nhớ câu trả lời cũ.",
    );
  };

  const checkAnswer = async () => {
    if (stage.input.kind === "choice") {
      const correct = choice === stage.input.correctIndex;
      recordAttempt(correct, correct ? stage.success : stage.retry);
      return;
    }
    if (stage.input.kind === "number") {
      const value = Number(response.replace(",", ".").trim());
      const correct = Number.isFinite(value) && Math.abs(value - stage.input.expected) <= stage.input.tolerance;
      recordAttempt(correct, correct ? stage.success : stage.retry);
      return;
    }
    if (stage.input.kind === "text") {
      if (clinicCard && !clinicPassed) return;
      const result = gradeExplanation({ answer: response, input: stage.input, prompt: stage.prompt, hints: stage.hints, activityId: stage.id });
      let repairQueued = false;
      if (result.passed) {
        if (resolveRepairItem(lesson.id, stage.id)) {
          recordLearningEvent({ eventType: "repair_resolved", lessonId: lesson.id, activityId: stage.id, outcome: "completed" });
          if (clinicCard) setClinicRetestDone(true);
        }
      } else if (result.repair) {
        repairQueued = Boolean(upsertRepairItem({
          lessonId: lesson.id,
          activityId: stage.id,
          lessonTitle: lesson.title,
          activityLabel: stage.label,
          reason: result.repair.reason,
          title: result.repair.title,
          prompt: result.repair.prompt,
          focusTerms: result.repair.focusTerms,
          hintLevel,
        }));
        if (repairQueued) recordLearningEvent({ eventType: "repair_created", lessonId: lesson.id, activityId: stage.id, outcome: "submitted", hintLevel });
      }
      recordAttempt(result.passed, result.passed ? stage.success : result.message, result.criteria, result.coach, repairQueued);
      return;
    }
    setPythonRun(null);
    setRunnerPhase("booting");
    let result: PythonRunResult;
    try {
      result = await runPythonLab(code, pythonLab, setRunnerPhase);
    } catch (error) {
      result = {
        passed: false,
        tests: [],
        output: "",
        error: error instanceof Error ? `Python worker không thể chạy: ${error.message}` : "Python worker không thể chạy trên trình duyệt này.",
      };
    } finally {
      setRunnerPhase(null);
    }
    setPythonRun(result);
    const message = result.passed
      ? `${stage.success} ${result.tests.length}/${result.tests.length} kiểm thử đạt.`
      : result.error ?? `${stage.retry} ${result.tests.filter((test) => test.passed).length}/${result.tests.length} kiểm thử đạt.`;
    const codeOutcome = result.passed
      ? "pass"
      : result.error?.includes("TimeLimitExceeded")
        ? "timeout"
        : result.error
          ? "runtime_error"
          : "fail";
    recordLearningEvent({
      eventType: "code_run",
      lessonId: lesson.id,
      activityId: stage.id,
      outcome: codeOutcome,
      hintLevel,
      durationMs: monotonicNow() - stageStartedAt.current,
      errorCode: result.error ? result.error.split(":", 1)[0].slice(0, 40) : undefined,
    });
    recordAttempt(result.passed, message);
  };

  const useHint = () => {
    const nextLevel = Math.min(2, hintLevel + 1);
    if (retryActivityId === stage.id) setRetryHints(nextLevel);
    recordLearningEvent({ eventType: "hint_opened", lessonId: lesson.id, activityId: stage.id, outcome: "opened", hintLevel: nextLevel });
    setProgress((current) => ({
      ...current,
      hintLevels: { ...current.hintLevels, [stage.id]: Math.min(2, (current.hintLevels[stage.id] ?? 0) + 1) },
    }));
  };

  const unlockCodeCoach = (level: 1 | 2) => {
    if (retryActivityId === stage.id) setRetryHints(level);
    recordLearningEvent({ eventType: "hint_opened", lessonId: lesson.id, activityId: stage.id, outcome: "opened", hintLevel: level });
    setProgress((current) => ({
      ...current,
      hintLevels: { ...current.hintLevels, [stage.id]: Math.max(level, current.hintLevels[stage.id] ?? 0) },
    }));
  };

  const insertSnippet = (snippet: string) => {
    const editor = codeEditorRef.current;
    const start = editor?.selectionStart ?? code.length;
    const end = editor?.selectionEnd ?? start;
    const prefix = code.slice(0, start);
    const suffix = code.slice(end);
    const lineStart = prefix.lastIndexOf("\n") + 1;
    const indentation = prefix.slice(lineStart).match(/^\s*/)?.[0] ?? "";
    const formattedSnippet = snippet.replace(/\n/g, `\n${indentation}`);
    const next = `${prefix}${formattedSnippet}${suffix}`;
    setCode(next);
    setFeedback(null);
    setPythonRun(null);
    queueMicrotask(() => editor?.focus());
  };

  const retryIndependently = (index: number) => {
    const activity = lesson.activities[index];
    setRetryActivityId(activity.id);
    setRetryHints(0);
    setProgress((current) => ({ ...current, currentIndex: index }));
    setChoice(null);
    setResponse("");
    setCode(activity.input.kind === "code" ? activity.input.starter : "");
    setReviewChoice(null);
    setReviewFeedback(null);
    setFeedback(null);
    setPythonRun(null);
  };
  const retryCodeIndependently = () => retryIndependently(codeActivityIndex);

  const reportScoringDispute = () => {
    recordLearningEvent({
      eventType: "scoring_dispute",
      lessonId: lesson.id,
      activityId: stage.id,
      outcome: "submitted",
      hintLevel,
    });
    markRepairDisputed(lesson.id, stage.id);
    setDisputeSent(true);
  };

  const nextStage = () => {
    const nextIndex = Math.min(lesson.activities.length - 1, progress.currentIndex + 1);
    const nextActivity = lesson.activities[nextIndex];
    setProgress((current) => ({ ...current, currentIndex: nextIndex }));
    setChoice(null);
    setReviewChoice(null);
    setReviewFeedback(null);
    setResponse("");
    setCode(nextActivity.input.kind === "code" ? nextActivity.input.starter : "");
    setFeedback(null);
    setPythonRun(null);
    setRunnerPhase(null);
    setDisputeSent(false);
  };

  const resetLesson = () => {
    setProgress(initialLessonProgress);
    setChoice(null);
    setReviewChoice(null);
    setReviewFeedback(null);
    setResponse("");
    setCode(firstCode?.input.kind === "code" ? firstCode.input.starter : "");
    setFeedback(null);
    setPythonRun(null);
    setRunnerPhase(null);
    setDisputeSent(false);
  };

  const canCheck = stage.input.kind === "choice"
    ? choice !== null
    : stage.input.kind === "code"
      ? code.trim().length > 0
      : response.trim().length > 0;

  const reviewing = lessonComplete && stageComplete && currentMastery === "review_due";
  const showActivity = !reviewing && !(lessonComplete && stageComplete && !(clinicCard && feedback?.correct));
  const repairing = repairItem?.activityId === stage.id;
  const workspaceMode = reviewing ? "Ôn tập đến hạn" : retryActivityId === stage.id ? "Làm lại độc lập" : repairing ? "Sửa mental model" : lessonComplete && stageComplete ? masteryLabel(currentMastery) : "Thực hành";
  const focusContext = reviewing ? `${lesson.id}:review` : showActivity ? `${stage.id}:${repairing ? "repair" : "practice"}` : `${lesson.id}:finish:${currentMastery}`;
  const independentRetry = retryActivityId === stage.id;
  useEffect(() => {
    if (!restored) return;
    const previousContext = lastFocusContext.current;
    lastFocusContext.current = { key: focusContext, independent: independentRetry };
    // Entering a retry needs orientation; a graded answer ending that retry does not.
    if (previousContext === null || (previousContext.key === focusContext && (!independentRetry || previousContext.independent))) return;
    activityHeading.current?.focus({ preventScroll: true });
    activityHeading.current?.scrollIntoView({ block: "start", behavior: "auto" });
  }, [focusContext, independentRetry, restored]);

  return (
    <div className="lab-screen">
      <header className="lab-topbar"><button className="back-link" onClick={onClose}>← {returnLabel}</button><div><span>{workspaceMode}</span><strong>{progress.completed.length}/{lesson.activities.length} hoạt động đạt</strong></div><span className="lab-count">{lessonEvidenceScore(progress, lesson.activities.length, lesson.activities.map((activity) => activity.id))}% bằng chứng</span></header>
      <div className="lab-columns">
        <details ref={outlineRef} className="workspace-outline" open>
          <summary>Nội dung bài học <span>{progress.completed.length}/{lesson.activities.length}</span></summary>
          <div className="outline-content"><p className="mono-label">R0 · {lesson.level}</p><h2>{lesson.title}</h2>
            <nav className="lesson-stepper" aria-label="Tiến độ bài học">
              {lesson.activities.map((item, index) => {
                const current = !reviewing && index === progress.currentIndex;
                const complete = progress.completed.includes(item.id);
                const locked = index > progress.completed.length;
                return <button key={item.id} aria-current={current ? "step" : undefined} className={current ? "active" : complete ? "complete" : ""} disabled={locked} onClick={() => { setProgress((current) => ({ ...current, currentIndex: index })); setFeedback(null); setChoice(null); setResponse(""); setCode(item.input.kind === "code" ? item.input.starter : ""); setDisputeSent(false); stageStartedAt.current = monotonicNow(); }}><span>{complete ? "✓" : index + 1}</span><span className="outline-step-copy"><strong>{item.label}</strong><small>{current && retryActivityId === item.id ? "Đang làm lại độc lập" : current && repairing ? "Đang sửa · kiểm tra lại" : current ? "Đang học" : complete ? "Đã có bằng chứng" : locked ? "Hoàn thành bước trước" : "Sẵn sàng"}</small></span></button>;
              })}
            </nav>
            <div className={reviewing ? "outline-review active" : "outline-review"} aria-current={reviewing ? "step" : undefined}><strong>Ôn tập sau 72 giờ</strong><small>{currentMastery === "mastered" ? "Đã xác minh độc lập" : reviewing ? "Đến hạn · đang ôn" : lessonComplete && standardIndependent ? `Mở sau ${reviewHours ?? 72} giờ` : "Cần đủ thực hành độc lập"}</small></div>
            <p className="outline-note">Hoàn thành từng bước để mở bước tiếp theo. Sau phần thực hành độc lập, ông sẽ có bài ôn sau 72 giờ.</p>
          </div>
        </details>
        <section className="inquiry-column" aria-labelledby="workspace-title">
          <header className="column-header"><div><p>{workspaceMode} · {reviewing ? "Biến thể độc lập" : `Hoạt động ${progress.currentIndex + 1} / ${lesson.activities.length}`}</p><h1 ref={workspaceHeading} tabIndex={-1} id="workspace-title">{lesson.title}</h1></div></header>
          {showActivity ? <article className="activity-brief workspace-question"><span className="mono-label indigo-text">{stage.label}</span><h2 ref={activityHeading} tabIndex={-1}>{stage.prompt}</h2><p><strong>Mục tiêu:</strong> {stage.evidence}</p></article> : null}
          <div className="workspace-instrument"><ConceptInstrument lesson={lesson} /></div>
          <div className="conversation">
            {storageWarning ? <p role="status">{storageWarning}</p> : null}
            {retryActivityId === null ? lesson.activities.map((activity, index) => progress.completed.includes(activity.id) && (progress.activityEvidence[activity.id]?.hintsUsed ?? progress.hintLevels[activity.id] ?? 0) > 0 && !progress.activityEvidence[activity.id]?.independentAt ? <button key={`retry-${activity.id}`} className="outline-action" onClick={() => retryIndependently(index)}>Làm lại độc lập: {activity.label}</button> : null) : null}
            {lessonComplete && stageComplete && currentMastery === "review_due" ? (
              <section className="delayed-review">
                <span className="mono-label indigo-text">ÔN TẬP ĐỘC LẬP · SAU 72 GIỜ</span>
                <h2 ref={activityHeading} tabIndex={-1}>{reviewActivity.prompt}</h2>
                <p>Tự trả lời mà không dùng gợi ý. Để xác nhận đã nắm vững bài, ông cần trả lời đúng lần ôn này và đã tự viết mã vượt qua kiểm thử.</p>
                <div className="review-options">
                  {reviewActivity.options.map((option, index) => <button key={option} aria-pressed={reviewChoice === index} className={reviewChoice === index ? "answer-option selected" : "answer-option"} onClick={() => { setReviewChoice(index); setReviewFeedback(null); }}><span>{String.fromCharCode(65 + index)}</span>{option}{reviewChoice === index && <i className="choice-check" aria-hidden="true">✓</i>}</button>)}
                </div>
                {reviewFeedback ? <div className={reviewChoice === reviewActivity.correctIndex && codeIndependent && standardIndependent ? "runtime-feedback correct" : "runtime-feedback retry"} role="status"><strong>{reviewChoice === reviewActivity.correctIndex ? (codeIndependent ? "Recall độc lập đạt" : "Còn thiếu code độc lập") : "Chưa mở mastery"}</strong><p>{reviewFeedback}</p>{reviewChoice === reviewActivity.correctIndex && !codeIndependent ? <button className="outline-action" onClick={retryCodeIndependently}>Xác minh code không trợ giúp</button> : null}</div> : null}
                <button className="primary-action" disabled={reviewSubmitDisabled} onClick={checkReview}>Chấm bài ôn</button>
              </section>
            ) : lessonComplete && stageComplete && !(clinicCard && feedback?.correct) ? (
              <section className="lesson-finish">
                <span className="finish-mark">{currentMastery === "mastered" ? "◆" : "✓"}</span>
                <p className="mono-label">{currentMastery === "mastered" ? "MASTERY VERIFIED" : "SESSION COMPLETE"}</p>
                <h2 ref={activityHeading} tabIndex={-1}>{currentMastery === "mastered" ? "Mental model đã vượt qua delayed recall." : "Ông đã xây được một mental model có thể dùng."}</h2>
                <p>{currentMastery === "mastered" ? reviewActivity.explanation : !standardIndependent ? "Đã hoàn thành có gợi ý. Dùng nút làm lại độc lập để tạo bằng chứng thực hành; lịch ôn mới bắt đầu sau lần đạt độc lập." : `${lesson.title} đã đủ practice evidence. Bài ôn độc lập sẽ mở sau ${reviewHours ?? 72} giờ.${codeIndependent ? " Code đã được xác minh không trợ giúp." : " Code Coach đã hỗ trợ; trước Mastered ông sẽ cần chạy lại code độc lập."}`}</p>
                <button className="outline-action" onClick={resetLesson}>Làm lại không gợi ý</button>
              </section>
            ) : (
              <>
                {stage.input.kind === "choice" ? (
                  <div className="answer-list runtime-answers">
                    {stage.input.options.map((label, index) => <button key={label} aria-pressed={choice === index} className={choice === index ? "answer-option selected" : "answer-option"} onClick={() => { setChoice(index); setFeedback(null); }}><span>{String.fromCharCode(65 + index)}</span>{label}{choice === index && <i className="choice-check" aria-hidden="true">✓</i>}</button>)}
                  </div>
                ) : null}

                {stage.input.kind === "number" ? <label className="response-field"><span>Kết quả tính toán</span><input inputMode="decimal" value={response} onChange={(event) => { setResponse(event.target.value); setFeedback(null); }} placeholder="Nhập một số" /></label> : null}
                {stage.input.kind === "text" ? <>{clinicCard ? <RepairClinic key={stage.id} card={clinicCard} focus={repairItem?.prompt ?? "Nối lại cơ chế còn thiếu."} passed={clinicPassed} onPass={() => setClinicPassed(true)} /> : null}<label className="response-field"><span>Giải thích bằng lời của ông</span><textarea rows={7} value={response} onChange={(event) => { setResponse(event.target.value); setFeedback(null); }} placeholder="Hãy kể cơ chế như đang giải thích cho một người bạn: cái gì tác động lên cái gì, rồi kết quả đổi ra sao?" /><small>{response.trim().length}/{stage.input.minLength} ký tự tối thiểu</small></label><div className="explanation-rubric" aria-label="Ba câu tự kiểm trước khi nộp"><header><strong>Trước khi nộp, tự hỏi 3 câu</strong></header><ul><li><span>1</span>Người nghe có lần theo được các bước bên trong cơ chế không?</li><li><span>2</span>Tôi đã nói rõ “vì sao” thay vì chỉ kể tên khái niệm chưa?</li><li><span>3</span>Tôi có dùng cấu trúc hoặc ví dụ của riêng mình không?</li></ul></div></> : null}
                {stage.input.kind === "code" ? <div className="python-lab"><label className="response-field code-field"><span>Trình soạn thảo Python</span><textarea ref={codeEditorRef} rows={10} spellCheck={false} autoCapitalize="off" autoCorrect="off" aria-describedby="python-limits" value={code} onChange={(event) => { setCode(event.target.value); setFeedback(null); setPythonRun(null); }} /></label><p className="sandbox-contract" id="python-limits">Chạy trên thiết bị · Tối đa 2,5 giây và 5.000 ký tự. Không hỗ trợ import, đọc tệp hoặc truy cập mạng.</p>{runnerPhase ? <div className="runner-status" role="status"><i />{runnerPhase === "booting" ? "Đang khởi động Python…" : "Đang chạy mã và kiểm thử…"}</div> : null}{pythonRun ? <div className={pythonRun.passed ? "test-report passed" : "test-report failed"}><header><strong>{pythonRun.passed ? "Đã vượt qua toàn bộ kiểm thử" : pythonRun.error ? "Chạy mã chưa thành công" : "Còn kiểm thử chưa đạt"}</strong>{pythonRun.tests.length > 0 ? <span>{pythonRun.tests.filter((test) => test.passed).length}/{pythonRun.tests.length} đạt</span> : null}</header>{pythonRun.error ? <p className="runtime-error">{pythonRun.error}</p> : null}<ul>{pythonRun.tests.map((test) => <li className={test.passed ? "passed" : "failed"} key={test.name}><span>{test.passed ? "✓" : "×"}</span>{test.name}</li>)}</ul>{pythonRun.output ? <pre aria-label="Kết quả in từ Python" tabIndex={0}>{pythonRun.output}</pre> : null}</div> : null}<section className="code-coach"><header><div><strong>Không nhớ lệnh Python?</strong><p>Hiểu thuật toán trước, rồi lấy đúng mảnh cú pháp cần dùng.</p></div><span>{hintLevel}/2 hỗ trợ</span></header>{hintLevel === 0 ? <button className="outline-action" onClick={() => unlockCodeCoach(1)}>Giải thích thuật toán bằng tiếng Việt</button> : <ol>{codeCoach.mentalSteps.map((step) => <li key={step}>{step}</li>)}</ol>}{hintLevel === 1 ? <button className="text-link" onClick={() => unlockCodeCoach(2)}>Tôi vẫn chưa biết viết lệnh → mở toolbox cú pháp</button> : null}{hintLevel >= 2 ? <div className="syntax-toolbox">{codeCoach.snippets.map((snippet) => <article key={snippet.label}><div><strong>{snippet.label}</strong><button onClick={() => insertSnippet(snippet.code)}>Chèn tại con trỏ</button></div><code>{snippet.code}</code><p>{snippet.why}</p></article>)}</div> : null}<small>Dùng Code Coach vẫn được tính là practice, nhưng Mastered yêu cầu chạy lại code không trợ giúp.</small></section></div> : null}

                {stage.input.kind !== "code" ? <div className="hint-ladder">
                  <div><span>Gợi ý từng bước</span><small>Đã dùng {hintLevel}/2 · được ghi vào tiến độ</small></div>
                  {stage.hints.slice(0, hintLevel).map((hint, index) => <p key={hint}><strong>Gợi ý {index + 1}:</strong> {hint}</p>)}
                  <button className="text-link" disabled={hintLevel >= 2} onClick={useHint}>{hintLevel >= 2 ? "Đã dùng hết gợi ý" : "Mở một gợi ý"}</button>
                </div> : null}

                {feedback ? <div className={feedback.correct ? "runtime-feedback correct coach-feedback" : "runtime-feedback retry coach-feedback"} role="status"><strong>{feedback.correct ? "Đã đạt bước này" : "Cần thử lại"}</strong>{feedback.coach ? <div className="coach-dialogue"><p>{feedback.coach.acknowledgement}</p><p>{feedback.coach.gap}</p><aside><span>BƯỚC SỬA NHỎ NHẤT</span><p>{feedback.coach.nextPrompt}</p></aside></div> : <p>{feedback.message}</p>}{feedback.criteria ? <details className="evidence-trace"><summary>Xem dấu vết chấm</summary><ul className="feedback-criteria">{feedback.criteria.map((criterion) => <li className={criterion.passed ? "passed" : "failed"} key={criterion.id}><span>{criterion.passed ? "✓" : "×"}</span>{criterion.label}</li>)}</ul></details> : null}{!feedback.correct && feedback.repairQueued ? <><p className="repair-confirmation">Đã thêm bài sửa này vào Hàng đợi sửa mental model.</p><button className="dispute-action" disabled={disputeSent} onClick={reportScoringDispute}>{disputeSent ? "Đã đánh dấu để tự xem lại" : "Kết quả chấm chưa hợp lý?"}</button></> : null}</div> : null}

                <div className="activity-actions">
                  <button className="primary-action" onClick={stageComplete ? nextStage : checkAnswer} disabled={runnerPhase !== null || (!stageComplete && (!canCheck || Boolean(clinicCard && !clinicPassed)))}>{stageComplete ? (progress.currentIndex === lesson.activities.length - 1 ? "Hoàn tất phiên học" : "Hoạt động tiếp theo →") : runnerPhase ? "Python đang chạy…" : stage.input.kind === "code" ? "Chạy mã và kiểm thử" : "Kiểm tra câu trả lời"}</button>
                  <span>{progress.attempts[stage.id] ?? 0} lần thử</span>
                </div>
              </>
            )}
          </div>
        </section>
        <details ref={supportRef} className="mental-column workspace-support" open>
          <summary>Hướng dẫn &amp; dẫn chứng</summary>
          <div className="mental-content">
            <article className="workspace-guidance"><span className="mono-label">{workspaceMode}</span><h2>{reviewing ? "Tự suy luận lại" : "Mục tiêu của bước này"}</h2><p>{reviewing ? "Trả lời biến thể không dùng gợi ý. Kết quả ôn và thực hành độc lập quyết định mastery." : stage.evidence}</p>{repairItem && repairing ? <p><strong>Mắt xích cần sửa:</strong> {repairItem.prompt}</p> : null}</article>
            <EvidenceSummary progress={progress} total={lesson.activities.length} />
            <article className={progress.completed.includes(lesson.activities[2].id) ? "mental-block complete" : "mental-block active"}><span>01 · KHÁI NIỆM</span><h3>{lesson.title}</h3><p>{lesson.concept}</p></article>
            <article className={progress.completed.includes(lesson.activities[3].id) ? "mental-block complete" : progress.currentIndex >= 2 ? "mental-block active" : "mental-block pending"}><span>02 · CƠ CHẾ</span><h3>Vì sao nó hoạt động?</h3><p>{lesson.mechanism}</p></article>
            <article className={progress.completed.includes(lesson.activities[4].id) ? "mental-block complete" : progress.currentIndex === 4 ? "mental-block active" : "mental-block pending"}><span>03 · VẬN DỤNG</span><h3>Dùng vào việc gì?</h3><p>{lesson.transfer}</p></article>
            <p className="source-note"><strong>Nguồn:</strong> {lesson.source.title} · {lesson.source.locator}</p>
          </div>
        </details>
      </div>
    </div>
  );
}

function ArchitectView({ snapshots, onStart }: { snapshots: LessonSnapshot[]; onStart: (lessonId: string) => void }) {
  const [selectedId, setSelectedId] = useState("vectors");
  const selected = curriculum.find((item) => item.id === selectedId) ?? curriculum[0];
  const selectedSnapshot = snapshots.find((item) => item.lessonId === selectedId);
  const groups = [
    { name: "Nature & Origin", lessons: curriculum.slice(0, 5) },
    { name: "Use & Test", lessons: curriculum.slice(5, 10) },
    { name: "Build & Validate", lessons: curriculum.slice(10) },
  ];
  return (
    <div className="wide-canvas">
      <header className="map-header"><div><p className="breadcrumb">Hub <span>›</span> AI Foundations <span>›</span> Map</p><h1>AI Foundations</h1><p>A structured matrix of 14 concepts. Select a node to review evidence and deepen mastery.</p></div><div className="map-legend"><span><i className="mastered" />Mastered</span><span><i className="active" />In progress</span><span><i />Unexplored</span></div></header>
      <div className="map-workspace">
        <div className="map-groups">
          {groups.map((group) => <section className="map-group" key={group.name}><h2>{group.name}</h2><div className="node-grid">{group.lessons.map((lesson) => { const evidence = snapshots.find((item) => item.lessonId === lesson.id); const nodeStatus = evidence?.state === "mastered" ? "mastered" : evidence?.state === "unexplored" || !evidence ? "unexplored" : "active"; return <button key={lesson.id} aria-pressed={selectedId === lesson.id} className={`concept-node ${nodeStatus} ${selectedId === lesson.id ? "selected" : ""}`} onClick={() => setSelectedId(lesson.id)}><span>LEVEL {String(curriculum.indexOf(lesson) + 1).padStart(2, "0")}</span><i /><h3>{lesson.title}</h3><p>{lesson.outcome}</p><small>{evidence ? `${masteryLabel(evidence.state)} · ${evidence.score}%` : "Chưa học · 0%"}</small></button>; })}</div></section>)}
        </div>
        <aside className="deep-dive">
          <header><h2>Deep Dive</h2><span>{selectedSnapshot ? `${masteryLabel(selectedSnapshot.state)} · ${selectedSnapshot.score}%` : "Chưa học"}</span></header>
          <div className="deep-dive-body"><span className="mono-label indigo-text">CONCEPT · {selected.id.toUpperCase()}</span><h3>{selected.title}</h3><p>{selected.outcome}</p><div className="transfer-test"><strong>TRANSFER TEST</strong><p>{selected.transfer}</p></div><div className="socratic-prompt"><span>✦</span><p>Ông có thể giải thích khi nào quy tắc này thất bại thay vì chỉ nêu định nghĩa?</p></div></div>
          <button className="deep-dive-action" onClick={() => onStart(selected.id)}><Icon name="brain" /> Enter Socratic Lab for this node</button>
        </aside>
      </div>
    </div>
  );
}

function PersonalInsightsPanel({ snapshots }: { snapshots: LessonSnapshot[] }) {
  const [summary, setSummary] = useState<LocalLearningSummary | null>(null);
  useEffect(() => { queueMicrotask(() => setSummary(getLocalLearningSummary())); }, [snapshots]);
  const completedEvidence = snapshots.reduce((sum, item) => sum + item.evidence.completed, 0);
  const independentEvidence = snapshots.reduce((sum, item) => sum + item.evidence.independent, 0);
  const assistedEvidence = completedEvidence - independentEvidence;
  const attempts = snapshots.reduce((sum, item) => sum + item.evidence.attempts, 0);
  const mastered = snapshots.filter((item) => item.state === "mastered").length;
  const explored = snapshots.filter((item) => item.state !== "unexplored").length;
  const rate = (value: number, total: number) => total ? `${Math.round(value / total * 100)}%` : "—";
  const metrics = [
    { label: "Concepts explored", value: `${explored}/14`, detail: "Bài có ít nhất một bằng chứng" },
    { label: "Evidence depth", value: `${completedEvidence}/70`, detail: "Hoạt động đã vượt qua" },
    { label: "Independent work", value: rate(independentEvidence, completedEvidence), detail: `${independentEvidence} bằng chứng không dùng hint` },
    { label: "Hint dependency", value: rate(assistedEvidence, completedEvidence), detail: `${assistedEvidence} bằng chứng có hỗ trợ` },
    { label: "Revision load", value: `${Math.max(0, attempts - completedEvidence)}`, detail: "Lần thử chưa tạo bằng chứng mới" },
    { label: "Delayed mastery", value: `${mastered}/14`, detail: "Đã vượt recall sau ≥72 giờ" },
  ];

  return (
    <section className="personal-insights" aria-labelledby="personal-insights-title">
      <header><div><span className="mono-label indigo-text">PRIVATE LEARNING MIRROR · THIS DEVICE</span><h2 id="personal-insights-title">Ông đang học độc lập đến mức nào?</h2><p>Mọi số liệu được tính ngay trong trình duyệt này. Không tài khoản, không database, không gửi câu trả lời hay code ra ngoài.</p></div><span className="local-only-badge">LOCAL ONLY</span></header>
      <div className="insights-grid">{metrics.map((metric) => <article key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><p>{metric.detail}</p></article>)}</div>
      <footer><span><strong>{summary?.codeRuns ?? 0}</strong> code runs</span><span><strong>{summary?.scoringDisputes ?? 0}</strong> chấm điểm cần xem lại</span><p>{summary?.codeFailures ? `${summary.codeFailures} lần Python lỗi/timeout — xem lại cú pháp hoặc vòng lặp.` : "Chưa có lỗi runtime được ghi nhận trên thiết bị này."}</p></footer>
    </section>
  );
}

function LearningPassport({ onRestored }: { onRestored: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [candidate, setCandidate] = useState<LearningBackup | null>(null);
  const [message, setMessage] = useState<{ tone: "neutral" | "success" | "error"; text: string } | null>(null);
  const summary = candidate ? summarizeLearningBackup(candidate) : null;

  const exportBackup = () => {
    try {
      const backup = createLearningBackup(window.localStorage);
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      if (blob.size > MAX_BACKUP_BYTES) throw new Error("backup_too_large");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `briliantai-learning-passport-${backup.exportedAt.slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      const count = summarizeLearningBackup(backup).itemCount;
      setMessage({ tone: "success", text: `Đã xuất ${count} mục dữ liệu. Hãy giữ file này như checkpoint cá nhân.` });
    } catch {
      setMessage({ tone: "error", text: "Trình duyệt không cho phép đọc hoặc tải file backup." });
    }
  };

  const inspectFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error("File backup lớn hơn giới hạn 500 KB.");
      const backup = parseLearningBackupText(await file.text());
      setCandidate(backup);
      setMessage({ tone: "neutral", text: "File hợp lệ. Kiểm tra thông tin bên dưới trước khi khôi phục." });
    } catch (error) {
      setCandidate(null);
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Không đọc được file backup." });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const restoreCandidate = () => {
    if (!candidate) return;
    try {
      const count = restoreLearningBackup(candidate, window.localStorage);
      setCandidate(null);
      setMessage({ tone: "success", text: `Đã khôi phục ${count} mục. Dashboard vừa được tính lại từ dữ liệu backup.` });
      onRestored();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Khôi phục thất bại; dữ liệu cũ vẫn được giữ." });
    }
  };

  return (
    <section className="learning-passport" aria-labelledby="learning-passport-title">
      <div className="passport-mark" aria-hidden="true"><span>BAI</span><strong>01</strong></div>
      <div className="passport-copy"><span className="mono-label">LEARNING PASSPORT · PORTABLE CHECKPOINT</span><h2 id="learning-passport-title">Đừng để một lần xóa cache xóa luôn hành trình học.</h2><p>Xuất tiến độ thành file riêng. Khi đổi trình duyệt hoặc mất dữ liệu, chọn file để kiểm tra rồi mới khôi phục. File chỉ chứa state học tập cục bộ của BriliantAI.</p></div>
      <div className="passport-actions">
        <button className="primary-action" onClick={exportBackup}>Tải backup JSON</button>
        <button className="outline-action" onClick={() => fileInputRef.current?.click()}>Chọn file khôi phục</button>
        <input ref={fileInputRef} hidden type="file" accept="application/json,.json" onChange={(event) => void inspectFile(event.target.files?.[0])} />
      </div>
      {message ? <p className={`passport-message ${message.tone}`} role="status">{message.text}</p> : null}
      {candidate && summary ? <div className="restore-preview"><div><span>Backup ngày</span><strong>{new Date(candidate.exportedAt).toLocaleString("vi-VN")}</strong></div><div><span>Lesson có dữ liệu</span><strong>{summary.lessonCount}/14</strong></div><div><span>R1–R4 labs</span><strong>{summary.expansionLabCount}/{expansionLabs.length}</strong></div><div><span>Diagnostic</span><strong>{summary.hasDiagnostic ? "Có" : "Không"}</strong></div><div><span>Learning log</span><strong>{summary.hasLearningLog ? "Có" : "Không"}</strong></div><div><span>Hàng sửa sai</span><strong>{summary.hasRepairQueue ? "Có" : "Không"}</strong></div><button className="primary-action" onClick={restoreCandidate}>Xác nhận khôi phục {summary.itemCount} mục</button><button className="text-link" onClick={() => { setCandidate(null); setMessage(null); }}>Hủy</button></div> : null}
    </section>
  );
}

function ChecklistView({ snapshots, onStart, onMap, onRestored }: { snapshots: LessonSnapshot[]; onStart: () => void; onMap: () => void; onRestored: () => void }) {
  const vector = snapshots.find((item) => item.lessonId === "vectors");
  const completed = vector?.progress.completed.length ?? 0;
  const evidenceStatus = (minimum: number) => completed >= minimum ? "mastered" : completed > 0 ? "developing" : "unexplored";
  const masteredCount = snapshots.filter((item) => item.state === "mastered").length;
  const developingCount = snapshots.filter((item) => !["mastered", "unexplored"].includes(item.state)).length;
  const unexploredCount = 14 - masteredCount - developingCount;
  const aspects = [
    { group: "1. Nature & Origin", title: "Prediction & Context", question: "Ông dự đoán được kết quả trước khi xem giải thích chưa?", status: evidenceStatus(1), note: completed >= 1 ? "Có prediction evidence từ lesson Vector." : "Chưa có bằng chứng." },
    { group: "1. Nature & Origin", title: "Mechanism", question: "Ông có nối được công thức với từng contribution không?", status: evidenceStatus(2), note: completed >= 2 ? "Đã có mechanism evidence." : "Cần hoàn thành hoạt động cơ chế." },
    { group: "2. Scope & Boundaries", title: "Explain & Boundary", question: "Ông giải thích được cơ chế và điểm dễ hiểu sai chưa?", status: evidenceStatus(3), note: completed >= 3 ? "Đã có Feynman evidence." : "Cần giải thích bằng ngôn ngữ của mình." },
    { group: "3. Impact", title: "Implementation & Transfer", question: "Ông có chuyển cơ chế sang code và tình huống mới chưa?", status: evidenceStatus(5), note: completed >= 5 ? "Đã hoàn tất code và transfer evidence." : "Chưa đủ bằng chứng chuyển giao." },
  ];
  return (
    <div className="checklist-canvas">
      <header className="checklist-header"><p className="breadcrumb">Learning Hub <span>›</span> Checklist Deep-Dive</p><h1>My Learning Journey: Aspect Mastery</h1><p>A comprehensive view of cognitive progress. Focus Socratic sessions on Developing and Unexplored aspects to achieve true mastery.</p></header>
      <section className="mastery-summary"><article className="mastered"><span>MASTERED</span><p><strong>{masteredCount}</strong>/14</p><div><i /></div></article><article className="developing"><span>DEVELOPING</span><p><strong>{developingCount}</strong>/14</p><div><i /></div></article><article><span>UNEXPLORED</span><p><strong>{unexploredCount}</strong>/14</p><div><i /></div></article></section>
      <section className="aspect-breakdown"><div className="section-title-row"><h2>Aspects Breakdown</h2><button className="text-link" onClick={onMap}>View Network Explorer ↗</button></div><div className="breakdown-list">{aspects.map((aspect, index) => <article className={`breakdown-item ${aspect.status}`} key={`${aspect.title}-${index}`}><span className="aspect-group">{index === 0 || aspects[index - 1].group !== aspect.group ? aspect.group : ""}</span><div className="aspect-detail"><div><h3>{aspect.title}</h3><span>{aspect.status}</span></div><p>{aspect.question}</p><aside><Icon name="brain" /><p>{aspect.note}</p></aside></div></article>)}</div></section>
      <PersonalInsightsPanel snapshots={snapshots} />
      <LearningPassport onRestored={onRestored} />
      <footer className="checklist-actions"><button className="primary-action" onClick={onStart}>✦ Resume Socratic Session</button><button className="outline-action" onClick={onMap}>View Knowledge Map</button></footer>
    </div>
  );
}

function SecondaryTools({ view, labOpen, onView, onLab, onHelp, onHistory }: { view: View; labOpen: boolean; onView: (view: View) => void; onLab: () => void; onHelp: () => void; onHistory: () => void }) {
  return <details className="secondary-tools"><summary>Công cụ học tập</summary><nav aria-label="Công cụ học tập" onClickCapture={(event) => { const details = event.currentTarget.closest("details"); details?.removeAttribute("open"); details?.querySelector("summary")?.focus(); }}>{secondaryItems.map((item) => <button key={item.id} aria-current={view === item.id && !labOpen ? "page" : undefined} className={view === item.id && !labOpen ? "side-link active" : "side-link"} onClick={() => onView(item.id)}><Icon name={item.id} />{item.label}</button>)}<button className={labOpen ? "side-link active" : "side-link"} aria-current={labOpen ? "page" : undefined} onClick={onLab}><Icon name="lab" />Socratic Lab</button><button className="side-link" onClick={onHelp}><Icon name="help" />Trợ giúp</button><button className="side-link" onClick={onHistory}><Icon name="reviews" />Lịch sử học</button></nav></details>;
}

function Sidebar({ view, labOpen, onView, onLab, onHelp, onHistory }: { view: View; labOpen: boolean; onView: (view: View) => void; onLab: () => void; onHelp: () => void; onHistory: () => void }) {
  return <aside className="side-nav"><a className="wordmark" href="#page-top">BriliantAI</a><nav aria-label="Điều hướng chính">{navItems.map((item) => <button key={item.id} aria-current={view === item.id && !labOpen ? "page" : undefined} className={view === item.id && !labOpen ? "side-link active" : "side-link"} onClick={() => onView(item.id)}><Icon name={item.id} />{item.label}</button>)}</nav><SecondaryTools view={view} labOpen={labOpen} onView={onView} onLab={onLab} onHelp={onHelp} onHistory={onHistory} /><div className="learner-profile"><Icon name="checklist" /><div><strong>Tiến độ trên thiết bị</strong><small>Lưu cục bộ · sao lưu bằng Passport</small></div></div></aside>;
}

function UtilityDialog({ panel, history, onClose }: { panel: Exclude<UtilityPanel, null>; history: LocalLearningEvent[]; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [onClose]);

  return (
    <div className="utility-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="utility-dialog" role="dialog" aria-modal="true" aria-labelledby="utility-dialog-title">
        <header><div><span className="mono-label">{panel === "help" ? "LEARNING GUIDE" : "LOCAL LEARNING LOG"}</span><h2 id="utility-dialog-title">{panel === "help" ? "Cách dùng BriliantAI" : "Lịch sử học trên thiết bị này"}</h2></div><button ref={closeRef} className="dialog-close" onClick={onClose} aria-label="Đóng">×</button></header>
        {panel === "help" ? <div className="help-guide">
          <article><strong>1. Tìm mắt xích yếu</strong><p>Làm diagnostic hoặc mở bài được đề xuất. Kết quả chỉ định hướng, không tự tăng mastery.</p></article>
          <article><strong>2. Tạo đủ bằng chứng</strong><p>Đi qua dự đoán → tính toán → giải thích → code → chuyển giao. Hint được ghi nhận để phân biệt hiểu độc lập và có hỗ trợ.</p></article>
          <article><strong>3. Sửa đúng lỗi</strong><p>Câu chưa đạt sẽ tạo một bài sửa cụ thể trong repair queue; ông không phải học lại toàn bộ lesson.</p></article>
          <article><strong>4. Xác minh sau 72 giờ</strong><p>Mastered chỉ mở sau delayed review và một lần chạy code không dựa vào Code Coach.</p></article>
          <aside><strong>Dữ liệu ở đâu?</strong><p>Mọi tiến độ, câu trả lời và lịch sử nằm trong trình duyệt của thiết bị này. Dùng Learning Passport để tự sao lưu.</p></aside>
        </div> : <div className="history-dialog-list">
          {history.length ? history.map((entry) => <article key={entry.id}><span className={`history-state ${entry.outcome ?? "submitted"}`}>{historyOutcome(entry)}</span><div><strong>{historyLessonTitle(entry)}</strong><p>{historyEventLabels[entry.eventType]}{entry.activityId ? ` · ${entry.activityId}` : ""}</p><small>{new Date(entry.occurredAt).toLocaleString("vi-VN")}</small></div></article>) : <div className="queue-empty"><strong>Chưa có dấu vết học.</strong><p>Hãy hoàn thành hoạt động đầu tiên để bắt đầu lịch sử.</p></div>}
        </div>}
      </section>
    </div>
  );
}

function MobileNav({ view, labOpen, onView, onLab, onHelp, onHistory }: { view: View; labOpen: boolean; onView: (view: View) => void; onLab: () => void; onHelp: () => void; onHistory: () => void }) {
  return <><header className="mobile-top"><strong>BriliantAI</strong><SecondaryTools view={view} labOpen={labOpen} onView={onView} onLab={onLab} onHelp={onHelp} onHistory={onHistory} /></header><nav className="mobile-bottom" aria-label="Điều hướng di động">{navItems.map((item) => <button key={item.id} aria-current={view === item.id && !labOpen ? "page" : undefined} className={view === item.id && !labOpen ? "active" : ""} onClick={() => onView(item.id)}><Icon name={item.id} /><span>{item.label}</span></button>)}</nav></>;
}

export function LearningDashboard() {
  return <AiProvider><LearningDashboardContent /></AiProvider>;
}

function LearningDashboardContent() {
  const [view, setView] = useState<View>("hub");
  const [sourceTarget, setSourceTarget] = useState<{ courseId?: string; lessonId?: string }>({});
  const [sourceNavigationId, setSourceNavigationId] = useState(0);
  const [sourceLibraryRevision, setSourceLibraryRevision] = useState(0);
  const [returnView, setReturnView] = useState<View>("hub");
  const [expansionReturnView, setExpansionReturnView] = useState<View>("hub");
  const [sourceReturnView, setSourceReturnView] = useState<View | null>(null);
  const [utilityPanel, setUtilityPanel] = useState<UtilityPanel>(null);
  const [labOpen, setLabOpen] = useState(false);
  const [diagnosticOpen, setDiagnosticOpen] = useState(false);
  const [sessionDiagnostic, setSessionDiagnostic] = useState<DiagnosticResult | null>(null);
  const [activeLessonId, setActiveLessonId] = useState("vectors");
  const [activeLessonMode, setActiveLessonMode] = useState<"practice" | "review">("practice");
  const [activeExpansionId, setActiveExpansionId] = useState<ExpansionLabId>("logic-truth-table");
  const [activeExpansionReviewId, setActiveExpansionReviewId] = useState<ExpansionLabId | null>(null);
  const [activeExpansionEdgeId, setActiveExpansionEdgeId] = useState<ExpansionEdgeId | null>(null);
  const [activeActivityId, setActiveActivityId] = useState<string | null>(null);
  const [masteryRevision, setMasteryRevision] = useState(0);
  const adaptive = useAdaptiveHubState(masteryRevision);
  const repositorySnapshot = adaptive.repositorySnapshot;
  const snapshots = toLessonSnapshots(repositorySnapshot?.lessons ?? {});
  const expansionProgress = repositorySnapshot?.expansion ?? emptyExpansionProgress;
  const repairItems = repositorySnapshot?.repairs ?? [];
  const history = repositorySnapshot?.history ?? [];
  const diagnostic = sessionDiagnostic ?? repositorySnapshot?.diagnostic ?? null;
  useEffect(() => {
    const clearRecoveryMarker = window.setTimeout(() => {
      try {
        window.sessionStorage.removeItem(ASSET_RECOVERY_KEY);
      } catch {
        // The marker is only a reload-loop guard.
      }
    }, 5_000);
    const onAssetError = (event: Event) => {
      const target = event.target;
      const source = target instanceof HTMLScriptElement
        ? target.src
        : target instanceof HTMLLinkElement
          ? target.href
          : "";
      if (/\/assets\/.*\.(?:js|css)(?:\?|$)/i.test(source)) recoverFromStaleAssets();
    };
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isStaleAssetFailure(event.reason)) recoverFromStaleAssets();
    };
    window.addEventListener("error", onAssetError, true);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.clearTimeout(clearRecoveryMarker);
      window.removeEventListener("error", onAssetError, true);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [view, labOpen, diagnosticOpen, activeLessonId]);
  const openView = (next: View) => { if (next === "studio" || next === "library") { setSourceNavigationId((value) => value + 1); setSourceTarget({}); setSourceReturnView(null); } if (next === "tracks") { if (view !== "tracks") setExpansionReturnView(view); setActiveExpansionReviewId(null); setActiveExpansionEdgeId(null); } setView(next); setLabOpen(false); setDiagnosticOpen(false); setUtilityPanel(null); setMasteryRevision((value) => value + 1); };
  const openStudio = (courseId?: string, lessonId?: string) => { openView(courseId ? "library" : "studio"); setSourceTarget({ courseId, lessonId }); if (courseId) setSourceReturnView(view); };
  const openLesson = (lessonId = "vectors", activityId: string | null = null, mode: "practice" | "review" = "practice") => { setReturnView(view); setActiveLessonId(lessonId); setActiveActivityId(activityId); setActiveLessonMode(mode); setDiagnosticOpen(false); setUtilityPanel(null); setLabOpen(true); };
  const closeLesson = () => { setView(returnView); setLabOpen(false); setMasteryRevision((value) => value + 1); };
  const openLearningItem = (lessonId: string) => {
    if (isExpansionLabId(lessonId)) {
      setActiveExpansionId(lessonId);
      setActiveExpansionReviewId(null);
      openView("tracks");
      return;
    }
    openLesson(lessonId);
  };
  const openExpansionItem = (labId: ExpansionLabId, reviewDue: boolean, edgeId?: ExpansionEdgeId) => {
    openView("tracks");
    setActiveExpansionId(labId);
    setActiveExpansionReviewId(reviewDue ? labId : null);
    setActiveExpansionEdgeId(edgeId ?? null);
  };
  const completeDiagnostic = (result: DiagnosticResult) => {
    setSessionDiagnostic(result);
    recordLearningEvent({ eventType: "diagnostic_completed", lessonId: result.recommendedLessonId, outcome: "completed" });
    try {
      window.localStorage.setItem("briliantai.diagnostic.v1", JSON.stringify(result));
    } catch {
      // The current result remains available in memory when storage is unavailable.
    }
    setMasteryRevision((value) => value + 1);
  };
  const refreshLocalState = () => {
    setSessionDiagnostic(null);
    setSourceLibraryRevision((value) => value + 1);
    setMasteryRevision((value) => value + 1);
  };

  const sourceVisible = !labOpen && !diagnosticOpen && (view === "studio" || view === "library");

  return (
    <div className={labOpen ? "app-shell focused-workspace" : "app-shell"} id="page-top">
      <a className="skip-link" href="#main-content">Đến nội dung chính</a>
      {!labOpen ? <><Sidebar view={view} labOpen={labOpen} onView={openView} onLab={() => openLesson(activeLessonId)} onHelp={() => setUtilityPanel("help")} onHistory={() => setUtilityPanel("history")} />
      <MobileNav view={view} labOpen={labOpen} onView={openView} onLab={() => openLesson(activeLessonId)} onHelp={() => setUtilityPanel("help")} onHistory={() => setUtilityPanel("history")} /></> : null}
      <main id="main-content" tabIndex={-1} className={labOpen ? "content-area lab-area" : "content-area"}>
        {labOpen ? <SocraticLab key={`${activeLessonId}:${activeActivityId ?? "resume"}:${activeLessonMode}`} lessonId={activeLessonId} targetActivityId={activeActivityId} initialMode={activeLessonMode} repairItem={repairItems.find((item) => item.lessonId === activeLessonId && item.activityId === activeActivityId) ?? null} returnLabel={navItems.find((item) => item.id === returnView)?.label ?? secondaryItems.find((item) => item.id === returnView)?.label ?? "Hôm nay"} onClose={closeLesson} /> : null}
        {diagnosticOpen && !labOpen ? <DiagnosticView previousResult={diagnostic} onComplete={completeDiagnostic} onClose={() => setDiagnosticOpen(false)} onStart={openLesson} /> : null}
        {!labOpen && !diagnosticOpen && view === "hub" ? <HubView adaptive={adaptive} snapshots={snapshots} expansionProgress={expansionProgress} repairs={repairItems} history={history} diagnostic={diagnostic} onDiagnostic={() => setDiagnosticOpen(true)} onStart={(lessonId) => openLesson(lessonId)} onAdaptiveLesson={openLesson} onExpansion={openExpansionItem} onRecent={openLearningItem} onRepair={openLesson} onMap={() => openView("architect")} onChecklist={() => openView("checklist")} onHistory={() => setUtilityPanel("history")} onStudio={openStudio} onLibrary={() => openView("library")} /> : null}
        {/* Keep the unsaved source form alive for this dashboard session only. */}
        <div hidden={!sourceVisible} inert={!sourceVisible} style={!sourceVisible ? { display: "none" } : undefined}>{sourceReturnView ? <button className="back-link" onClick={() => openView(sourceReturnView)}>← {navItems.find((item) => item.id === sourceReturnView)?.label ?? "Quay lại"}</button> : null}<SourceStudio mode={view === "library" ? "library" : "create"} visible={sourceVisible} libraryRevision={sourceLibraryRevision} navigationId={sourceNavigationId} initialCourseId={sourceTarget.courseId} initialLessonId={sourceTarget.lessonId} onCreate={() => openView("studio")} onLibrary={() => openView("library")} onLesson={openLesson} onTrack={(labId) => openExpansionItem(labId, false)} /></div>
        {!labOpen && !diagnosticOpen && view === "tracks" ? <ExpansionWorkbench initialLabId={activeExpansionId} initialReviewLabId={activeExpansionReviewId} initialEdgeId={activeExpansionEdgeId} onReviewClose={() => { setActiveExpansionReviewId(null); openView(expansionReturnView); }} onBack={() => { setActiveExpansionReviewId(null); setActiveExpansionEdgeId(null); openView(expansionReturnView); }} /> : null}
        {!labOpen && !diagnosticOpen && view === "reviews" ? <div className="reviews-canvas"><header className="template-page-header"><h1>Ôn tập</h1><p>Trở lại đúng bài, sau khoảng cách trí nhớ. Bài ôn chỉ mở khi đủ 72 giờ.</p></header>{adaptive.hydrated ? <><ReviewQueue snapshots={snapshots} expansionProgress={expansionProgress} onStart={openLesson} onExpansion={openExpansionItem} /><SourceReviews onOpen={openStudio} /></> : <p role="status">Đang đọc lịch ôn trên thiết bị…</p>}</div> : null}
        {!labOpen && !diagnosticOpen && view === "architect" ? <ArchitectView snapshots={snapshots} onStart={openLesson} /> : null}
        {!labOpen && !diagnosticOpen && view === "settings" ? <AiSettings /> : null}
        {!labOpen && !diagnosticOpen && view === "checklist" ? <ChecklistView snapshots={snapshots} onStart={() => openLesson("vectors")} onMap={() => openView("architect")} onRestored={refreshLocalState} /> : null}
      </main>
      {utilityPanel ? <UtilityDialog panel={utilityPanel} history={history} onClose={() => setUtilityPanel(null)} /> : null}
    </div>
  );
}
