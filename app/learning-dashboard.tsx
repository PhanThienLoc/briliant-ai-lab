"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { curriculum, todayQueue } from "../lib/curriculum";

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

const topics = [
  { eyebrow: "MATHEMATICS", title: "Vector & Dot Product", mastery: 36, tone: "indigo" },
  { eyebrow: "DATA ENGINEERING", title: "Data Quality Gates", mastery: 75, tone: "emerald" },
  { eyebrow: "MACHINE LEARNING", title: "Evaluation Foundations", mastery: 15, tone: "slate" },
];

function ActiveTopics({ onStart, onMap }: { onStart: () => void; onMap: () => void }) {
  return (
    <section className="template-card achievement-card active-topics" aria-labelledby="active-topics-title">
      <div className="section-title-row">
        <h2 id="active-topics-title"><Icon name="brain" /> Active Topics</h2>
        <button className="text-link" onClick={onMap}>View All</button>
      </div>
      <div className="topic-grid">
        {topics.map((topic, index) => (
          <button className="topic-card" key={topic.title} onClick={index === 0 ? onStart : onMap}>
            <span className="mono-label">{topic.eyebrow}</span>
            <strong>{topic.title}</strong>
            <div className="topic-progress-label"><span>Mastery</span><b className={topic.tone}>{topic.mastery}%</b></div>
            <div className="progress-track"><i className={topic.tone} style={{ width: `${topic.mastery}%` }} /></div>
          </button>
        ))}
      </div>
    </section>
  );
}

function CognitiveDepth() {
  const levels = [
    { label: "Remember", value: 100, status: "complete" },
    { label: "Understand", value: 85, status: "complete" },
    { label: "Apply", value: 60, status: "developing" },
    { label: "Analyze", value: 55, status: "current" },
    { label: "Evaluate", value: 40, status: "future" },
    { label: "Create", value: 25, status: "future" },
  ];
  return (
    <section className="template-card depth-card" aria-labelledby="depth-title">
      <h2 id="depth-title">Cognitive Depth</h2>
      <p>Aggregate progress across active topics based on Bloom&apos;s Taxonomy.</p>
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

function AspectAnalysis({ onOpen }: { onOpen: () => void }) {
  const aspects = [
    { label: "Conceptual Clarity", score: "14/18", width: 77, tone: "emerald" },
    { label: "Logical Coherence", score: "9/18", width: 50, tone: "indigo" },
    { label: "Practical Application", score: "4/18", width: 22, tone: "slate" },
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

function HubView({ onStart, onMap, onChecklist }: { onStart: () => void; onMap: () => void; onChecklist: () => void }) {
  return (
    <div className="hub-canvas">
      <header className="template-page-header"><h1>Learning Hub</h1><p>Your current academic focus and cognitive progress overview.</p></header>
      <ActiveTopics onStart={onStart} onMap={onMap} />
      <div className="dashboard-grid"><CognitiveDepth /><AspectAnalysis onOpen={onChecklist} /></div>
      <FeynmanBlock onStart={onStart} />
      <RecentDialogues onStart={onStart} />
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

function SocraticLab({ onClose }: { onClose: () => void }) {
  const [answer, setAnswer] = useState<number | null>(null);
  const [recorded, setRecorded] = useState(false);
  return (
    <div className="lab-screen">
      <header className="lab-topbar"><button className="back-link" onClick={onClose}>← Learning Hub</button><div><span>Target:</span><strong>Analyzing (Bloom&apos;s Level 4)</strong></div><span className="lab-count">05 / 14</span></header>
      <div className="lab-columns">
        <section className="inquiry-column">
          <header className="column-header"><div><h1>Socratic Inquiry</h1><p>Topic: Vector & Dot Product</p></div><span>Depth 03</span></header>
          <div className="conversation">
            <article className="message ai-message"><span>✦</span><div><p>Excellent start. Ông đã nhận ra dot product cộng các feature contribution lại.</p><strong>Now, consider the “Why”.</strong><p>Khi x₃ dương, tăng w₃ sẽ làm prediction thay đổi theo chiều nào?</p></div></article>
            <div className="answer-list">
              {["Giảm", "Không đổi", "Tăng"].map((label, index) => <button key={label} className={answer === index ? "answer-option selected" : "answer-option"} onClick={() => { setAnswer(index); setRecorded(false); }}><span>{String.fromCharCode(65 + index)}</span>{label}</button>)}
            </div>
            {answer !== null ? <article className={answer === 2 ? "message ai-message response correct" : "message ai-message response retry"}><span>✦</span><div><strong>{answer === 2 ? "Đúng — hãy kiểm chứng ở Mental Model." : "Chưa đúng với cơ chế."}</strong><p>{answer === 2 ? "Vì x₃ = 3 > 0, mỗi 0.5 thêm vào w₃ làm ŷ tăng 1.5." : "Theo dõi riêng dấu của x₃ và contribution thứ ba."}</p></div></article> : <p className="hint-text">Dự đoán trước, sau đó kéo thanh trượt ở Mental Model.</p>}
            <button className="primary-action record-action" disabled={answer !== 2} onClick={() => setRecorded(true)}>{recorded ? "Evidence recorded ✓" : "Record evidence"}</button>
          </div>
        </section>
        <aside className="mental-column">
          <header className="column-header"><div><h2>Mental Model</h2><p>Live computational workspace</p></div><span className="draft-label">Drafting</span></header>
          <div className="mental-content">
            <DotProductModel />
            <article className="mental-block complete"><span>1. THE CONCEPT</span><h3>Dot Product</h3><p>Tổng các đóng góp xᵢ × wᵢ tạo thành prediction.</p></article>
            <article className="mental-block active"><span>2. THE MECHANISM (THE “HOW”)</span><h3>Sign and magnitude</h3><p>Dấu của xᵢ quyết định hướng; độ lớn của xᵢ quyết định độ nhạy với wᵢ.</p></article>
            <article className="mental-block pending"><span>3. APPLICATION (THE “SO WHAT”)</span><h3>Transfer to code</h3><p>To be developed after the verbal explanation.</p></article>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ArchitectView({ onStart }: { onStart: () => void }) {
  const [selectedId, setSelectedId] = useState("vectors");
  const selected = curriculum.find((item) => item.id === selectedId) ?? curriculum[0];
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
          {groups.map((group) => <section className="map-group" key={group.name}><h2>{group.name}</h2><div className="node-grid">{group.lessons.map((lesson) => <button key={lesson.id} className={`concept-node ${lesson.status} ${selectedId === lesson.id ? "selected" : ""}`} onClick={() => setSelectedId(lesson.id)}><span>LEVEL {String(curriculum.indexOf(lesson) + 1).padStart(2, "0")}</span><i /><h3>{lesson.title}</h3><p>{lesson.outcome}</p><small>{lesson.statusLabel}</small></button>)}</div></section>)}
        </div>
        <aside className="deep-dive">
          <header><h2>Deep Dive</h2><span>{selected.statusLabel}</span></header>
          <div className="deep-dive-body"><span className="mono-label indigo-text">CONCEPT · {selected.id.toUpperCase()}</span><h3>{selected.title}</h3><p>{selected.outcome}</p><div className="transfer-test"><strong>TRANSFER TEST</strong><p>{selected.transfer}</p></div><div className="socratic-prompt"><span>✦</span><p>Ông có thể giải thích khi nào quy tắc này thất bại thay vì chỉ nêu định nghĩa?</p></div></div>
          <button className="deep-dive-action" onClick={onStart}><Icon name="brain" /> Enter Socratic Lab for this node</button>
        </aside>
      </div>
    </div>
  );
}

function ChecklistView({ onStart, onMap }: { onStart: () => void; onMap: () => void }) {
  const aspects = [
    { group: "1. Nature & Origin", title: "Problem & Context", question: "Nó đang giải quyết vấn đề gì và xuất phát từ đâu?", status: "mastered", note: "Phiên Socratic đã xác định rõ bối cảnh và problem domain." },
    { group: "1. Nature & Origin", title: "Mechanism", question: "Nó hoạt động ở cấp độ cấu trúc như thế nào?", status: "mastered", note: "Ông đã nối công thức với từng feature contribution." },
    { group: "2. Scope & Boundaries", title: "Boundary & Edge-cases", question: "Khái niệm này vỡ ở đâu?", status: "developing", note: "Đã thấy ranh giới cốt lõi nhưng chưa kiểm tra extreme edge cases." },
    { group: "3. Impact", title: "Tradeoffs & Consequences", question: "Chi phí của việc áp dụng khái niệm này là gì?", status: "unexplored", note: "Chưa có bằng chứng." },
  ];
  return (
    <div className="checklist-canvas">
      <header className="checklist-header"><p className="breadcrumb">Learning Hub <span>›</span> Checklist Deep-Dive</p><h1>My Learning Journey: Aspect Mastery</h1><p>A comprehensive view of cognitive progress. Focus Socratic sessions on Developing and Unexplored aspects to achieve true mastery.</p></header>
      <section className="mastery-summary"><article className="mastered"><span>MASTERED</span><p><strong>8</strong>/18</p><div><i /></div></article><article className="developing"><span>DEVELOPING</span><p><strong>6</strong>/18</p><div><i /></div></article><article><span>UNEXPLORED</span><p><strong>4</strong>/18</p><div><i /></div></article></section>
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
  const openView = (next: View) => { setView(next); setLabOpen(false); };

  return (
    <main className="app-shell" id="page-top">
      <Sidebar view={view} labOpen={labOpen} onView={openView} onLab={() => setLabOpen(true)} />
      <MobileNav view={view} labOpen={labOpen} onView={openView} onLab={() => setLabOpen(true)} />
      <div className={labOpen ? "content-area lab-area" : "content-area"}>
        {labOpen ? <SocraticLab onClose={() => setLabOpen(false)} /> : null}
        {!labOpen && view === "hub" ? <HubView onStart={() => setLabOpen(true)} onMap={() => openView("architect")} onChecklist={() => openView("checklist")} /> : null}
        {!labOpen && view === "architect" ? <ArchitectView onStart={() => setLabOpen(true)} /> : null}
        {!labOpen && view === "checklist" ? <ChecklistView onStart={() => setLabOpen(true)} onMap={() => openView("architect")} /> : null}
      </div>
    </main>
  );
}
