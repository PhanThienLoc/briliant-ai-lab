"use client";

import { useMemo, useState } from "react";
import { curriculum, todayQueue } from "../lib/curriculum";

type View = "today" | "map" | "review";

const navItems: Array<{ id: View; label: string; hint: string }> = [
  { id: "today", label: "Hôm nay", hint: "Phiên học được đề xuất" },
  { id: "map", label: "Bản đồ", hint: "Quan hệ giữa các khái niệm" },
  { id: "review", label: "Ôn tập", hint: "Truy hồi kiến thức đã học" },
];

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

function ProgressRing({ value }: { value: number }) {
  const style = { "--progress": `${value * 3.6}deg` } as React.CSSProperties;

  return (
    <div className="progress-ring" style={style} aria-label={`${value}% hoàn thành`}>
      <div>
        <strong>{value}%</strong>
        <span>khóa MVP</span>
      </div>
    </div>
  );
}

function MiniLab({ onClose }: { onClose: () => void }) {
  const [weight, setWeight] = useState(2);
  const [answer, setAnswer] = useState<number | null>(null);
  const input = 3;
  const prediction = weight * input;

  return (
    <section className="lab-panel" aria-labelledby="lab-title">
      <div className="lab-header">
        <div>
          <p className="eyebrow">Tương tác mẫu</p>
          <h2 id="lab-title">Trọng số thay đổi dự đoán ra sao?</h2>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Đóng bài học">
          ×
        </button>
      </div>

      <p className="lab-copy">
        Mô hình tuyến tính đơn giản dùng <code>ŷ = w × x</code>. Giữ <code>x = 3</code> và kéo
        trọng số để quan sát đầu ra.
      </p>

      <div className="equation-card">
        <span>ŷ</span><span>=</span><strong>{weight}</strong><span>×</span><strong>{input}</strong>
        <span>=</span><output>{prediction}</output>
      </div>

      <label className="slider-label" htmlFor="weight">
        <span>Trọng số w</span><strong>{weight}</strong>
      </label>
      <input
        id="weight"
        type="range"
        min="-3"
        max="5"
        step="1"
        value={weight}
        onChange={(event) => {
          setWeight(Number(event.target.value));
          setAnswer(null);
        }}
      />

      <div className="prediction-question">
        <p>Nếu tăng w nhưng giữ x dương, điều gì xảy ra với ŷ?</p>
        <div className="answer-row">
          {["Giảm", "Không đổi", "Tăng"].map((label, index) => (
            <button
              key={label}
              className={answer === index ? "answer selected" : "answer"}
              onClick={() => setAnswer(index)}
              aria-pressed={answer === index}
            >
              {label}
            </button>
          ))}
        </div>
        {answer !== null ? (
          <p className={answer === 2 ? "feedback correct" : "feedback retry"} role="status">
            {answer === 2
              ? "Đúng. Khi x dương, tăng w làm tích w × x tăng."
              : "Chưa đúng. Hãy nhìn lại tích w × x khi x vẫn dương."}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function TodayView({ onStart }: { onStart: () => void }) {
  return (
    <>
      <section className="hero-grid">
        <article className="continue-card">
          <div className="continue-copy">
            <p className="eyebrow light">Phiên học tiếp theo · 12 phút</p>
            <h2>Vector và dot product</h2>
            <p>Biến một phép tính trừu tượng thành cách mô hình kết hợp feature với trọng số.</p>
            <div className="lesson-meta">
              <span>Lesson 05/14</span><span>2 hoạt động</span><span>1 bài chuyển giao</span>
            </div>
            <button className="primary-button" onClick={onStart}>
              Bắt đầu phiên học <span aria-hidden="true">→</span>
            </button>
          </div>
          <div className="vector-visual" aria-hidden="true">
            <div className="axis axis-x" />
            <div className="axis axis-y" />
            <div className="vector vector-a"><span>a</span></div>
            <div className="vector vector-b"><span>w</span></div>
            <div className="dot-grid" />
          </div>
        </article>

        <article className="mastery-card">
          <div className="card-heading">
            <div><p className="eyebrow">Tiến độ</p><h2>Năng lực đang hình thành</h2></div>
            <span className="status-pill">Đúng nhịp</span>
          </div>
          <div className="mastery-body">
            <ProgressRing value={36} />
            <ul>
              <li><span className="legend-dot mastered" />3 đã vững</li>
              <li><span className="legend-dot active" />2 đang học</li>
              <li><span className="legend-dot locked" />9 chưa mở</li>
            </ul>
          </div>
          <p className="quiet-note">Mastery chỉ tăng sau bài chuyển giao và lần ôn trì hoãn.</p>
        </article>
      </section>

      <section className="content-grid">
        <div>
          <div className="section-heading">
            <div><p className="eyebrow">Learning queue</p><h2>Việc đáng làm hôm nay</h2></div>
            <span className="time-budget">32 phút</span>
          </div>
          <div className="queue-list">
            {todayQueue.map((item, index) => (
              <article className="queue-item" key={item.title}>
                <span className={`queue-index tone-${index + 1}`}>0{index + 1}</span>
                <div className="queue-copy">
                  <div><strong>{item.title}</strong><span>{item.type}</span></div>
                  <p>{item.description}</p>
                </div>
                <span className="queue-time">{item.minutes}m</span>
              </article>
            ))}
          </div>
        </div>

        <aside className="insight-card">
          <div className="insight-icon" aria-hidden="true">↗</div>
          <p className="eyebrow">Misconception radar</p>
          <h2>Một lỗi đang lặp lại</h2>
          <p>
            Ông thường đọc <strong>correlation</strong> như quan hệ nhân quả. Lần ôn tới sẽ dùng
            một phản ví dụ mới để kiểm tra lại.
          </p>
          <div className="insight-footer"><span>Gặp 2 lần</span><span>Ôn sau 1 ngày</span></div>
        </aside>
      </section>
    </>
  );
}

function MapView() {
  return (
    <section className="map-card">
      <div className="section-heading map-heading">
        <div><p className="eyebrow">Concept graph</p><h2>Từ dữ liệu thô đến mô hình biết học</h2></div>
        <span className="status-pill">14 concepts</span>
      </div>
      <div className="concept-path">
        {curriculum.map((lesson, index) => (
          <article className={`concept-node ${lesson.status}`} key={lesson.id}>
            <div className="node-topline">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <span className="node-status">{lesson.statusLabel}</span>
            </div>
            <h3>{lesson.title}</h3>
            <p>{lesson.outcome}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ReviewView() {
  const reviewItems = useMemo(
    () => curriculum.filter((lesson) => lesson.status === "mastered" || lesson.status === "active"),
    [],
  );

  return (
    <section className="review-card">
      <div className="section-heading">
        <div><p className="eyebrow">Retrieval practice</p><h2>Ôn để còn dùng được sau này</h2></div>
        <span className="status-pill">{reviewItems.length} khái niệm</span>
      </div>
      <div className="review-grid">
        {reviewItems.map((lesson, index) => (
          <article className="review-item" key={lesson.id}>
            <span className="review-day">{index === 0 ? "Hôm nay" : `Sau ${index * 2 + 1} ngày`}</span>
            <h3>{lesson.title}</h3>
            <p>{lesson.transfer}</p>
            <div className="review-signals"><span>Không gợi ý</span><span>Bối cảnh mới</span></div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function LearningDashboard() {
  const [view, setView] = useState<View>("today");
  const [showLab, setShowLab] = useState(false);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#top" aria-label="BriliantAI Lab">
          <BrandMark /><span>Briliant<span>AI</span></span>
        </a>
        <nav aria-label="Điều hướng chính">
          {navItems.map((item, index) => (
            <button
              key={item.id}
              className={view === item.id ? "nav-button active" : "nav-button"}
              onClick={() => { setView(item.id); setShowLab(false); }}
              title={item.hint}
            >
              <span className="nav-number">{index + 1}</span><span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="streak">7</span>
          <div><strong>Ngày liên tiếp</strong><span>Nhịp nhỏ, tiến bộ thật</span></div>
        </div>
      </aside>

      <div className="workspace" id="top">
        <header className="topbar">
          <div>
            <p className="date-label">Thứ ba · 25 tháng 8</p>
            <h1>{view === "today" ? "Sẵn sàng làm rõ một ý tưởng?" : view === "map" ? "Bản đồ năng lực" : "Ôn tập chủ động"}</h1>
          </div>
          <div className="profile-chip" aria-label="Hồ sơ người học">
            <span className="profile-avatar">L</span>
            <div><strong>Thiên Lộc</strong><span>AI · Data path</span></div>
          </div>
        </header>

        {showLab ? <MiniLab onClose={() => setShowLab(false)} /> : null}
        {!showLab && view === "today" ? <TodayView onStart={() => setShowLab(true)} /> : null}
        {!showLab && view === "map" ? <MapView /> : null}
        {!showLab && view === "review" ? <ReviewView /> : null}
      </div>
    </main>
  );
}
