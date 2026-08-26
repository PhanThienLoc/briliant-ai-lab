"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { curriculum, todayQueue } from "../lib/curriculum";
import { getLesson, getReview, lessonCatalog, type LessonContent } from "../lib/lesson-catalog";
import {
  hoursUntilReview,
  initialLessonProgress,
  lessonEvidenceScore,
  masteryLabel,
  masteryState,
  normalizeProgress,
  reviewDueAt,
  type LessonProgress,
  type MasteryState,
} from "../lib/mastery-engine";

type View = "hub" | "architect" | "checklist";
type IconName = View | "lab" | "help" | "plus" | "arrow" | "brain";

const navItems: Array<{ id: View; label: string }> = [
  { id: "hub", label: "Learning Hub" },
  { id: "architect", label: "Architect" },
  { id: "checklist", label: "Checklist" },
];

function Icon({ name }: { name: IconName }) {
  if (name === "plus") return <span className="text-icon" aria-hidden="true">＋</span>;
  if (name === "help") return <span className="text-icon help-icon" aria-hidden="true">?</span>;
  if (name === "arrow") return <span className="text-icon" aria-hidden="true">→</span>;

  const shapes: Record<Exclude<IconName, "plus" | "help" | "arrow">, ReactNode> = {
    hub: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>,
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
};

function useMasterySnapshot(revision: number): LessonSnapshot[] {
  const [snapshot, setSnapshot] = useState<LessonSnapshot[]>(() => lessonCatalog.lessons.map((lesson) => ({
    lessonId: lesson.id,
    title: lesson.title,
    level: lesson.level,
    score: 0,
    state: "unexplored",
    progress: initialLessonProgress,
  })));
  useEffect(() => {
    queueMicrotask(() => {
      const next = lessonCatalog.lessons.map((lesson) => {
        let stored: unknown = null;
        try {
          const current = window.localStorage.getItem(`briliantai.lesson.${lesson.id}.progress.v3`);
          const legacy = window.localStorage.getItem(`briliantai.lesson.${lesson.id}.progress.v2`);
          stored = JSON.parse(current ?? legacy ?? "null");
        } catch {
          stored = null;
        }
        const progress = normalizeProgress(stored, lesson.activities.length);
        return {
          lessonId: lesson.id,
          title: lesson.title,
          level: lesson.level,
          score: lessonEvidenceScore(progress, lesson.activities.length),
          state: masteryState(progress, lesson.activities.length),
          progress,
        };
      });
      setSnapshot(next);
    });
  }, [revision]);
  return snapshot;
}

function ActiveTopics({ snapshots, onStart, onMap }: { snapshots: LessonSnapshot[]; onStart: (lessonId: string) => void; onMap: () => void }) {
  const preferredIds = ["problem-frame", "vectors", "validation"];
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
  const completedActivities = snapshots.flatMap((item) => Object.values(item.progress.activityEvidence));
  const independent = completedActivities.filter((item) => item.attempts === 1 && item.hintsUsed === 0).length;
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

function ReviewQueue({ snapshots, onStart }: { snapshots: LessonSnapshot[]; onStart: (lessonId: string) => void }) {
  const due = snapshots.filter((item) => item.state === "review_due");
  const waiting = snapshots.filter((item) => item.state === "practiced");
  const visible = [...due, ...waiting].slice(0, 3);
  return (
    <section className="hub-section review-queue" aria-labelledby="review-queue-title">
      <div className="section-title-row"><div><span className="mono-label">SPACED REVIEW</span><h2 className="hub-section-title" id="review-queue-title">Delayed recall queue</h2></div><strong className={due.length ? "queue-count due" : "queue-count"}>{due.length} đến hạn</strong></div>
      {visible.length ? <div className="review-list">{visible.map((item) => <button key={item.lessonId} onClick={() => onStart(item.lessonId)}><span className={item.state === "review_due" ? "review-state due" : "review-state"}>{item.state === "review_due" ? "ÔN NGAY" : `${hoursUntilReview(item.progress) ?? 72}H`}</span><span><strong>{item.title}</strong><small>{item.state === "review_due" ? "Bài transfer độc lập đã mở" : "Đang chờ khoảng cách trí nhớ 72 giờ"}</small></span><Icon name="arrow" /></button>)}</div> : <div className="queue-empty"><strong>Chưa có bài trong hàng đợi.</strong><p>Hoàn thành đủ 5 hoạt động của một lesson để hệ thống đặt lịch ôn sau 72 giờ.</p></div>}
    </section>
  );
}

function RecentDialogues({ onStart }: { onStart: () => void }) {
  return (
    <section className="hub-section recent-section" aria-labelledby="recent-title">
      <div className="section-title-row"><h2 className="hub-section-title" id="recent-title">Recent Socratic Dialogues</h2><span className="quiet-link">View History →</span></div>
      <div className="recent-list">
        {todayQueue.slice(0, 3).map((item, index) => (
          <button className="recent-row" key={item.title} onClick={onStart}>
            <span className={index === 0 ? "recent-icon active" : "recent-icon"}><Icon name="brain" /></span>
            <span><strong>{item.title}</strong><small>{item.type} · {index === 0 ? "2 giờ trước" : "Hôm qua"}</small></span>
            <span className="exchange"><small>Minutes</small><b>{item.minutes}</b></span><Icon name="arrow" />
          </button>
        ))}
      </div>
    </section>
  );
}

function HubView({ snapshots, onStart, onMap, onChecklist }: { snapshots: LessonSnapshot[]; onStart: (lessonId: string) => void; onMap: () => void; onChecklist: () => void }) {
  return (
    <div className="hub-canvas">
      <header className="template-page-header"><h1>Learning Hub</h1><p>Your current academic focus and cognitive progress overview.</p></header>
      <ActiveTopics snapshots={snapshots} onStart={onStart} onMap={onMap} />
      <div className="dashboard-grid"><CognitiveDepth snapshots={snapshots} /><AspectAnalysis snapshots={snapshots} onOpen={onChecklist} /></div>
      <ReviewQueue snapshots={snapshots} onStart={onStart} />
      <FeynmanBlock onStart={() => onStart("vectors")} />
      <RecentDialogues onStart={() => onStart("vectors")} />
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
  if (lesson.id === "vectors") return <DotProductModel />;
  return (
    <section className="concept-instrument" aria-label={`Mô hình khái niệm ${lesson.title}`}>
      <header><span className="mono-label">CAUSAL MODEL</span><strong>{lesson.level}</strong></header>
      <div className="causal-chain">
        <article><span>01</span><strong>Concept</strong><p>{lesson.concept}</p></article>
        <i aria-hidden="true">↓</i>
        <article><span>02</span><strong>Mechanism</strong><p>{lesson.mechanism}</p></article>
        <i aria-hidden="true">↓</i>
        <article><span>03</span><strong>Transfer</strong><p>{lesson.transfer}</p></article>
      </div>
    </section>
  );
}

function SocraticLab({ lessonId, onClose }: { lessonId: string; onClose: () => void }) {
  const lesson = getLesson(lessonId);
  const reviewActivity = getReview(lessonId);
  const [progress, setProgress] = useState<LessonProgress>(initialLessonProgress);
  const [restored, setRestored] = useState(false);
  const [choice, setChoice] = useState<number | null>(null);
  const [reviewChoice, setReviewChoice] = useState<number | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState<string | null>(null);
  const [response, setResponse] = useState("");
  const firstCode = lesson.activities.find((activity) => activity.input.kind === "code");
  const [code, setCode] = useState(firstCode?.input.kind === "code" ? firstCode.input.starter : "");
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null);

  const stage = lesson.activities[Math.min(progress.currentIndex, lesson.activities.length - 1)];
  const stageComplete = progress.completed.includes(stage.id);
  const lessonComplete = progress.completed.length === lesson.activities.length;
  const hintLevel = progress.hintLevels[stage.id] ?? 0;
  const currentMastery = masteryState(progress, lesson.activities.length);
  const reviewHours = hoursUntilReview(progress);
  const storageKey = `briliantai.lesson.${lesson.id}.progress.v3`;
  const legacyStorageKey = `briliantai.lesson.${lesson.id}.progress.v2`;

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = window.localStorage.getItem(storageKey) ?? window.localStorage.getItem(legacyStorageKey);
        if (saved) setProgress(normalizeProgress(JSON.parse(saved), lesson.activities.length));
      } catch {
        // Progress remains available for the current session when storage is unavailable.
      }
      setRestored(true);
    });
  }, [legacyStorageKey, lesson.activities.length, storageKey]);

  useEffect(() => {
    if (!restored) return;
    window.localStorage.setItem(storageKey, JSON.stringify(progress));
  }, [progress, restored, storageKey]);

  const recordAttempt = (correct: boolean, message: string) => {
    setProgress((current) => ({
      ...(() => {
        const attempts = (current.attempts[stage.id] ?? 0) + 1;
        const isNewEvidence = correct && !current.completed.includes(stage.id);
        const completed = isNewEvidence ? [...current.completed, stage.id] : current.completed;
        const completedAt = new Date().toISOString();
        const justPracticed = completed.length === lesson.activities.length && !current.practicedAt;
        const practicedAt = justPracticed ? completedAt : current.practicedAt;
        return {
          ...current,
          attempts: { ...current.attempts, [stage.id]: attempts },
          completed,
          activityEvidence: isNewEvidence ? {
            ...current.activityEvidence,
            [stage.id]: { completedAt, attempts, hintsUsed: current.hintLevels[stage.id] ?? 0 },
          } : current.activityEvidence,
          practicedAt,
          review: justPracticed && practicedAt ? {
            dueAt: reviewDueAt(practicedAt),
            completedAt: null,
            attempts: 0,
            correct: false,
          } : current.review,
        };
      })(),
    }));
    setFeedback({ correct, message });
  };

  const checkReview = () => {
    if (reviewChoice === null) return;
    const correct = reviewChoice === reviewActivity.correctIndex;
    setProgress((current) => ({
      ...current,
      review: {
        dueAt: current.review?.dueAt ?? reviewDueAt(current.practicedAt ?? new Date().toISOString()),
        attempts: (current.review?.attempts ?? 0) + 1,
        completedAt: correct ? new Date().toISOString() : current.review?.completedAt ?? null,
        correct: correct || current.review?.correct === true,
      },
    }));
    setReviewFeedback(correct ? reviewActivity.explanation : "Chưa đúng. Hãy suy luận lại từ cơ chế thay vì nhớ câu trả lời cũ.");
  };

  const checkAnswer = () => {
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
      const normalized = response.toLocaleLowerCase("vi");
      const concepts = stage.input.rubricTerms.filter((term) => normalized.includes(term.toLocaleLowerCase("vi")));
      const correct = response.trim().length >= stage.input.minLength && concepts.length >= stage.input.requiredTerms;
      recordAttempt(correct, correct ? stage.success : stage.retry);
      return;
    }
    const correct = stage.input.requiredTokens.every((token) => code.includes(token));
    recordAttempt(correct, correct ? stage.success : stage.retry);
  };

  const useHint = () => {
    setProgress((current) => ({
      ...current,
      hintLevels: { ...current.hintLevels, [stage.id]: Math.min(2, (current.hintLevels[stage.id] ?? 0) + 1) },
    }));
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
  };

  const resetLesson = () => {
    setProgress(initialLessonProgress);
    setChoice(null);
    setReviewChoice(null);
    setReviewFeedback(null);
    setResponse("");
    setCode(firstCode?.input.kind === "code" ? firstCode.input.starter : "");
    setFeedback(null);
  };

  const canCheck = stage.input.kind === "choice"
    ? choice !== null
    : stage.input.kind === "code"
      ? code.trim().length > 0
      : response.trim().length > 0;

  return (
    <div className="lab-screen">
      <header className="lab-topbar"><button className="back-link" onClick={onClose}>← Learning Hub</button><div><span>Lesson runtime:</span><strong>{lessonComplete ? masteryLabel(currentMastery) : stage.label}</strong></div><span className="lab-count">{lessonEvidenceScore(progress, lesson.activities.length)}%</span></header>
      <div className="lab-columns">
        <section className="inquiry-column">
          <header className="column-header"><div><h1>{lesson.title}</h1><p>{lesson.level} · Từ dữ liệu thô đến mô hình biết học</p></div><span>{lessonComplete ? masteryLabel(currentMastery).toUpperCase() : `STEP ${progress.currentIndex + 1}`}</span></header>
          <div className="conversation">
            <nav className="lesson-stepper" aria-label="Tiến độ bài học">
              {lesson.activities.map((item, index) => <button key={item.id} className={progress.completed.includes(item.id) ? "complete" : index === progress.currentIndex ? "active" : ""} disabled={index > progress.completed.length} onClick={() => { setProgress((current) => ({ ...current, currentIndex: index })); setFeedback(null); setChoice(null); setResponse(""); setCode(item.input.kind === "code" ? item.input.starter : ""); }}><span>{progress.completed.includes(item.id) ? "✓" : index + 1}</span><small>{item.label}</small></button>)}
            </nav>

            {lessonComplete && stageComplete && currentMastery === "review_due" ? (
              <section className="delayed-review">
                <span className="mono-label indigo-text">DELAYED TRANSFER · ≥72 HOURS</span>
                <h2>{reviewActivity.prompt}</h2>
                <p>Không dùng hint. Một đáp án đúng sẽ mở trạng thái Mastered cho lesson này.</p>
                <div className="review-options">
                  {reviewActivity.options.map((option, index) => <button key={option} className={reviewChoice === index ? "answer-option selected" : "answer-option"} onClick={() => { setReviewChoice(index); setReviewFeedback(null); }}><span>{String.fromCharCode(65 + index)}</span>{option}</button>)}
                </div>
                {reviewFeedback ? <div className={reviewChoice === reviewActivity.correctIndex ? "runtime-feedback correct" : "runtime-feedback retry"} role="status"><strong>{reviewChoice === reviewActivity.correctIndex ? "Recall độc lập đạt" : "Chưa mở mastery"}</strong><p>{reviewFeedback}</p></div> : null}
                <button className="primary-action" disabled={reviewChoice === null || currentMastery === "mastered"} onClick={checkReview}>Chấm bài ôn</button>
              </section>
            ) : lessonComplete && stageComplete ? (
              <section className="lesson-finish">
                <span className="finish-mark">{currentMastery === "mastered" ? "◆" : "✓"}</span>
                <p className="mono-label">{currentMastery === "mastered" ? "MASTERY VERIFIED" : "SESSION COMPLETE"}</p>
                <h2>{currentMastery === "mastered" ? "Mental model đã vượt qua delayed recall." : "Ông đã xây được một mental model có thể dùng."}</h2>
                <p>{currentMastery === "mastered" ? reviewActivity.explanation : `${lesson.title} đã đủ practice evidence. Bài ôn độc lập sẽ mở sau ${reviewHours ?? 72} giờ.`}</p>
                <button className="outline-action" onClick={resetLesson}>Làm lại không gợi ý</button>
              </section>
            ) : (
              <>
                <article className="activity-brief">
                  <span className="mono-label indigo-text">{stage.eyebrow}</span>
                  <h2>{stage.prompt}</h2>
                  <p>Bằng chứng cần thu: {stage.evidence}</p>
                </article>

                {stage.input.kind === "choice" ? (
                  <div className="answer-list runtime-answers">
                    {stage.input.options.map((label, index) => <button key={label} className={choice === index ? "answer-option selected" : "answer-option"} onClick={() => { setChoice(index); setFeedback(null); }}><span>{String.fromCharCode(65 + index)}</span>{label}</button>)}
                  </div>
                ) : null}

                {stage.input.kind === "number" ? <label className="response-field"><span>Kết quả tính toán</span><input inputMode="decimal" value={response} onChange={(event) => { setResponse(event.target.value); setFeedback(null); }} placeholder="Nhập một số" /></label> : null}
                {stage.input.kind === "text" ? <label className="response-field"><span>Giải thích bằng lời của ông</span><textarea rows={7} value={response} onChange={(event) => { setResponse(event.target.value); setFeedback(null); }} placeholder="Viết mental model bằng ngôn ngữ của ông..." /><small>{response.trim().length}/{stage.input.minLength} ký tự tối thiểu</small></label> : null}
                {stage.input.kind === "code" ? <label className="response-field code-field"><span>Python editor · structural checks</span><textarea rows={8} spellCheck={false} value={code} onChange={(event) => { setCode(event.target.value); setFeedback(null); }} /></label> : null}

                <div className="hint-ladder">
                  <div><span>Hint ladder</span><small>{hintLevel}/2 · dùng hint sẽ được ghi vào evidence</small></div>
                  {stage.hints.slice(0, hintLevel).map((hint, index) => <p key={hint}><strong>Gợi ý {index + 1}:</strong> {hint}</p>)}
                  <button className="text-link" disabled={hintLevel >= 2} onClick={useHint}>{hintLevel >= 2 ? "Đã dùng hết gợi ý" : "Mở một gợi ý"}</button>
                </div>

                {feedback ? <div className={feedback.correct ? "runtime-feedback correct" : "runtime-feedback retry"} role="status"><strong>{feedback.correct ? "Bằng chứng hợp lệ" : "Chưa đạt rubric"}</strong><p>{feedback.message}</p></div> : null}

                <div className="activity-actions">
                  <button className="primary-action" onClick={stageComplete ? nextStage : checkAnswer} disabled={!stageComplete && !canCheck}>{stageComplete ? (progress.currentIndex === lesson.activities.length - 1 ? "Hoàn tất phiên học" : "Hoạt động tiếp theo →") : "Kiểm tra câu trả lời"}</button>
                  <span>{progress.attempts[stage.id] ?? 0} lần thử</span>
                </div>
              </>
            )}
          </div>
        </section>
        <aside className="mental-column">
          <header className="column-header"><div><h2>Mental Model</h2><p>Live computational workspace</p></div><span className="draft-label">{lessonComplete ? "Practiced" : "Building"}</span></header>
          <div className="mental-content">
            <ConceptInstrument lesson={lesson} />
            <EvidenceSummary progress={progress} total={lesson.activities.length} />
            <article className={progress.completed.includes(lesson.activities[2].id) ? "mental-block complete" : "mental-block active"}><span>1. THE CONCEPT</span><h3>{lesson.title}</h3><p>{lesson.concept}</p></article>
            <article className={progress.completed.includes(lesson.activities[3].id) ? "mental-block complete" : progress.currentIndex >= 2 ? "mental-block active" : "mental-block pending"}><span>2. THE MECHANISM</span><h3>How it works</h3><p>{lesson.mechanism}</p></article>
            <article className={progress.completed.includes(lesson.activities[4].id) ? "mental-block complete" : progress.currentIndex === 4 ? "mental-block active" : "mental-block pending"}><span>3. TRANSFER</span><h3>Where it matters</h3><p>{lesson.transfer}</p></article>
            <p className="source-note"><strong>Nguồn:</strong> {lesson.source.title} · {lesson.source.locator}</p>
          </div>
        </aside>
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
          {groups.map((group) => <section className="map-group" key={group.name}><h2>{group.name}</h2><div className="node-grid">{group.lessons.map((lesson) => { const evidence = snapshots.find((item) => item.lessonId === lesson.id); const nodeStatus = evidence?.state === "mastered" ? "mastered" : evidence?.state === "unexplored" || !evidence ? "unexplored" : "active"; return <button key={lesson.id} className={`concept-node ${nodeStatus} ${selectedId === lesson.id ? "selected" : ""}`} onClick={() => setSelectedId(lesson.id)}><span>LEVEL {String(curriculum.indexOf(lesson) + 1).padStart(2, "0")}</span><i /><h3>{lesson.title}</h3><p>{lesson.outcome}</p><small>{evidence ? `${masteryLabel(evidence.state)} · ${evidence.score}%` : "Chưa học · 0%"}</small></button>; })}</div></section>)}
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

function ChecklistView({ snapshots, onStart, onMap }: { snapshots: LessonSnapshot[]; onStart: () => void; onMap: () => void }) {
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
      <footer className="checklist-actions"><button className="primary-action" onClick={onStart}>✦ Resume Socratic Session</button><button className="outline-action" onClick={onMap}>View Knowledge Map</button></footer>
    </div>
  );
}

function Sidebar({ view, labOpen, onView, onLab }: { view: View; labOpen: boolean; onView: (view: View) => void; onLab: () => void }) {
  return (
    <aside className="side-nav">
      <a className="wordmark" href="#page-top">BriliantAI</a>
      <div className="learner-profile"><span>PL</span><div><strong>Deep Learner</strong><small>Level: Analyzing</small></div></div>
      <nav aria-label="Điều hướng chính">
        <button className={view === "hub" && !labOpen ? "side-link active" : "side-link"} onClick={() => onView("hub")}><Icon name="hub" />Learning Hub</button>
        <button className={labOpen ? "side-link active" : "side-link"} onClick={onLab}><Icon name="lab" />Socratic Lab</button>
        {navItems.slice(1).map((item) => <button key={item.id} className={view === item.id && !labOpen ? "side-link active" : "side-link"} onClick={() => onView(item.id)}><Icon name={item.id} />{item.label}</button>)}
      </nav>
      <div className="side-footer"><button className="new-session" onClick={onLab}><Icon name="plus" />Start New Session</button><button className="utility-link"><Icon name="help" />Help</button></div>
    </aside>
  );
}

function MobileNav({ view, labOpen, onView, onLab }: { view: View; labOpen: boolean; onView: (view: View) => void; onLab: () => void }) {
  return <><header className="mobile-top"><strong>BriliantAI</strong><span>PL</span></header><nav className="mobile-bottom" aria-label="Điều hướng di động"><button className={view === "hub" && !labOpen ? "active" : ""} onClick={() => onView("hub")}><Icon name="hub" /><span>Hub</span></button><button className={labOpen ? "active" : ""} onClick={onLab}><Icon name="lab" /><span>Lab</span></button><button className={view === "architect" && !labOpen ? "active" : ""} onClick={() => onView("architect")}><Icon name="architect" /><span>Map</span></button><button className={view === "checklist" && !labOpen ? "active" : ""} onClick={() => onView("checklist")}><Icon name="checklist" /><span>Checklist</span></button></nav></>;
}

export function LearningDashboard() {
  const [view, setView] = useState<View>("hub");
  const [labOpen, setLabOpen] = useState(false);
  const [activeLessonId, setActiveLessonId] = useState("vectors");
  const [masteryRevision, setMasteryRevision] = useState(0);
  const snapshots = useMasterySnapshot(masteryRevision);
  const openView = (next: View) => { setView(next); setLabOpen(false); setMasteryRevision((value) => value + 1); };
  const openLesson = (lessonId = "vectors") => { setActiveLessonId(lessonId); setLabOpen(true); };
  const closeLesson = () => { setLabOpen(false); setMasteryRevision((value) => value + 1); };

  return (
    <main className="app-shell" id="page-top">
      <Sidebar view={view} labOpen={labOpen} onView={openView} onLab={() => openLesson(activeLessonId)} />
      <MobileNav view={view} labOpen={labOpen} onView={openView} onLab={() => openLesson(activeLessonId)} />
      <div className={labOpen ? "content-area lab-area" : "content-area"}>
        {labOpen ? <SocraticLab key={activeLessonId} lessonId={activeLessonId} onClose={closeLesson} /> : null}
        {!labOpen && view === "hub" ? <HubView snapshots={snapshots} onStart={openLesson} onMap={() => openView("architect")} onChecklist={() => openView("checklist")} /> : null}
        {!labOpen && view === "architect" ? <ArchitectView snapshots={snapshots} onStart={openLesson} /> : null}
        {!labOpen && view === "checklist" ? <ChecklistView snapshots={snapshots} onStart={() => openLesson("vectors")} onMap={() => openView("architect")} /> : null}
      </div>
    </main>
  );
}
