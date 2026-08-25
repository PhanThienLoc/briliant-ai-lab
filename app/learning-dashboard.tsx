"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { curriculum, todayQueue } from "../lib/curriculum";

type View = "today" | "map" | "review";

const navItems: Array<{ id: View; label: string; hint: string }> = [
  { id: "today", label: "Hôm nay", hint: "Hành động học quan trọng nhất" },
  { id: "map", label: "Bản đồ", hint: "Quan hệ giữa các khái niệm" },
  { id: "review", label: "Ôn tập", hint: "Truy hồi kiến thức đã học" },
];

const evidence = [
  { label: "Dạng chuẩn", detail: "Đã tự giải", state: "done" },
  { label: "Dạng biến thể", detail: "Còn thiếu", state: "next" },
  { label: "Chuyển sang code", detail: "Còn thiếu", state: "open" },
  { label: "Ôn sau 72 giờ", detail: "Chưa đến hạn", state: "later" },
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

function ContributionBars({ weight }: { weight: number }) {
  const rows = [
    { feature: "x₁", x: 2, weight: 1, tone: "green" },
    { feature: "x₂", x: -1, weight: 2, tone: "orange" },
    { feature: "x₃", x: 3, weight, tone: "blue" },
  ];

  return (
    <div className="contribution-list" aria-label="Đóng góp của từng feature">
      {rows.map((row) => {
        const contribution = row.x * row.weight;
        const width = Math.min(100, Math.abs(contribution) * 13 + 8);
        const style = { "--bar-width": `${width}%` } as CSSProperties;

        return (
          <div className="contribution-row" key={row.feature}>
            <span className="feature-name">{row.feature}</span>
            <span className="feature-formula">{row.x} × {row.weight}</span>
            <span className={`contribution-track ${row.tone}`}>
              <span style={style} />
            </span>
            <output>{Number.isInteger(contribution) ? contribution : contribution.toFixed(1)}</output>
          </div>
        );
      })}
    </div>
  );
}

function DotProductWorkbench({ compact = false }: { compact?: boolean }) {
  const [weight, setWeight] = useState(0.5);
  const prediction = 2 - 2 + 3 * weight;

  return (
    <div className={compact ? "workbench compact" : "workbench"}>
      <div className="workbench-head">
        <div>
          <span className="micro-label">MÔ HÌNH ĐANG CHẠY</span>
          <strong>Feature contributions</strong>
        </div>
        <span className="live-indicator"><i />LIVE</span>
      </div>

      <ContributionBars weight={weight} />

      <div className="workbench-equation" aria-live="polite">
        <span>ŷ = x · w</span>
        <strong>{prediction.toFixed(1)}</strong>
      </div>

      <label className="instrument-control" htmlFor={compact ? "preview-weight" : "lesson-weight"}>
        <span><strong>Thử thay w₃</strong><small>x₃ đang cố định ở 3</small></span>
        <output>{weight.toFixed(1)}</output>
      </label>
      <input
        id={compact ? "preview-weight" : "lesson-weight"}
        type="range"
        min="-2"
        max="3"
        step="0.5"
        value={weight}
        onChange={(event) => setWeight(Number(event.target.value))}
        aria-label="Trọng số thứ ba"
      />
      <div className="range-scale" aria-hidden="true"><span>−2</span><span>0</span><span>3</span></div>
    </div>
  );
}

function EvidenceLedger() {
  return (
    <section className="evidence-ledger" aria-labelledby="evidence-title">
      <div className="ledger-heading">
        <div><p className="kicker">EVIDENCE LEDGER</p><h2 id="evidence-title">Bằng chứng còn thiếu</h2></div>
        <span className="ledger-count">1/4</span>
      </div>
      <div className="evidence-list">
        {evidence.map((item, index) => (
          <div className={`evidence-row ${item.state}`} key={item.label}>
            <span className="evidence-index">0{index + 1}</span>
            <span><strong>{item.label}</strong><small>{item.detail}</small></span>
            <i aria-hidden="true" />
          </div>
        ))}
      </div>
      <p className="ledger-note">Mastery không tăng vì mở xong bài. Hệ thống đợi bằng chứng độc lập, chuyển giao và ghi nhớ.</p>
    </section>
  );
}

function MiniLab({ onClose }: { onClose: () => void }) {
  const [answer, setAnswer] = useState<number | null>(null);
  const [recorded, setRecorded] = useState(false);

  return (
    <section className="lesson-shell" aria-labelledby="lab-title">
      <header className="lesson-rail">
        <button className="back-button" onClick={onClose} aria-label="Quay lại màn hình hôm nay">
          <span aria-hidden="true">←</span> Hôm nay
        </button>
        <div className="lesson-progress"><span style={{ width: "36%" }} /></div>
        <span className="lesson-position">05 / 14</span>
      </header>

      <div className="lesson-layout">
        <article className="lesson-notebook">
          <p className="kicker">QUAN SÁT 01 · VECTOR</p>
          <h1 id="lab-title">Một prediction được lắp ráp như thế nào?</h1>
          <p className="lesson-lead">
            Mỗi feature đưa một phần bằng <code>xᵢ × wᵢ</code>. Dot product chỉ là thao tác cộng
            tất cả những phần đóng góp đó lại.
          </p>

          <div className="notebook-rule" />

          <section className="thinking-prompt" aria-labelledby="prediction-title">
            <span className="prompt-number">01</span>
            <div>
              <p className="kicker">DỰ ĐOÁN TRƯỚC KHI THỬ</p>
              <h2 id="prediction-title">Khi x₃ dương, tăng w₃ sẽ làm ŷ thay đổi thế nào?</h2>
            </div>
          </section>

          <div className="answer-stack">
            {["Giảm", "Không đổi", "Tăng"].map((label, index) => (
              <button
                key={label}
                className={answer === index ? "answer selected" : "answer"}
                onClick={() => { setAnswer(index); setRecorded(false); }}
                aria-pressed={answer === index}
              >
                <span>{String.fromCharCode(65 + index)}</span>{label}
              </button>
            ))}
          </div>

          {answer !== null ? (
            <div className={answer === 2 ? "feedback correct" : "feedback retry"} role="status">
              <strong>{answer === 2 ? "Đúng — hãy kiểm chứng ở mô hình bên cạnh." : "Chưa khớp với mô hình."}</strong>
              <p>
                {answer === 2
                  ? "Vì x₃ = 3 > 0, mỗi 0.5 thêm vào w₃ làm prediction tăng 1.5. Kéo thanh trượt và theo dõi cả contribution lẫn ŷ."
                  : "Giữ mắt ở hàng x₃. Dấu của x₃ quyết định chiều thay đổi khi w₃ tăng."}
              </p>
            </div>
          ) : (
            <p className="answer-hint">Chọn một dự đoán rồi dùng mô hình để phản biện chính mình.</p>
          )}

          <button className="record-button" disabled={answer !== 2} onClick={() => setRecorded(true)}>
            {recorded ? "Đã ghi vào evidence ledger ✓" : "Ghi nhận quan sát"}
          </button>
        </article>

        <aside className="lesson-instrument" aria-label="Mô hình dot product tương tác">
          <DotProductWorkbench />
          <div className="instrument-note">
            <span>GỢI Ý QUAN SÁT</span>
            <p>Đổi dấu w₃. Contribution đổi hướng trước khi tổng prediction đổi dấu.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function TodayView({ onStart }: { onStart: () => void }) {
  return (
    <>
      <section className="decision-board" aria-labelledby="next-action-title">
        <div className="decision-copy">
          <div className="session-line">
            <span className="session-tag">NEXT BEST ACTION</span>
            <span>12 phút · Lesson 05/14</span>
          </div>
          <p className="course-context">TỪ DỮ LIỆU THÔ ĐẾN MÔ HÌNH BIẾT HỌC</p>
          <h2 id="next-action-title">Vector và dot product</h2>
          <p className="decision-reason">
            Ông đã đọc được công thức. Bước tiếp theo là nhìn thấy từng feature đóng góp vào
            prediction như thế nào trước khi viết code.
          </p>
          <div className="why-now">
            <span>Vì sao bài này?</span>
            <p>Mô hình tuyến tính đang bị khóa cho tới khi bằng chứng biến thể này hoàn thành.</p>
          </div>
          <button className="primary-action" onClick={onStart}>
            Mở bàn thí nghiệm <span aria-hidden="true">→</span>
          </button>
        </div>
        <DotProductWorkbench compact />
      </section>

      <div className="today-layout">
        <section className="today-plan" aria-labelledby="today-plan-title">
          <div className="surface-heading">
            <div><p className="kicker">32 PHÚT TẬP TRUNG</p><h2 id="today-plan-title">Việc đáng làm hôm nay</h2></div>
            <span>4 hoạt động</span>
          </div>
          <div className="queue-ledger">
            {todayQueue.map((item, index) => (
              <div className={index === 0 ? "queue-row current" : "queue-row"} key={item.title}>
                <span className="queue-order">{String(index + 1).padStart(2, "0")}</span>
                <div><strong>{item.title}</strong><p>{item.description}</p></div>
                <span className="queue-type">{item.type}</span>
                <time>{item.minutes}m</time>
              </div>
            ))}
          </div>
        </section>

        <div className="side-stack">
          <EvidenceLedger />
          <aside className="misconception-note">
            <p className="kicker">MISCONCEPTION #C-07</p>
            <h2>Correlation chưa phải causation.</h2>
            <p>Ông đã dùng cùng một suy luận sai hai lần. Review tới sẽ đổi bối cảnh để kiểm tra xem mô hình tinh thần đã sửa chưa.</p>
            <div><span>Gặp 2 lần</span><span>Ôn sau 1 ngày</span></div>
          </aside>
        </div>
      </div>
    </>
  );
}

function MapView() {
  return (
    <section className="flat-surface">
      <div className="surface-heading map-heading">
        <div><p className="kicker">CONCEPT GRAPH · RELEASE 0</p><h2>Từ dữ liệu thô đến mô hình biết học</h2></div>
        <span>14 concepts</span>
      </div>
      <div className="map-legend"><span><i className="mastered" />Đã vững</span><span><i className="active" />Đang học</span><span><i className="available" />Có thể mở</span><span><i className="locked" />Chưa mở</span></div>
      <div className="concept-ledger">
        {curriculum.map((lesson, index) => (
          <article className={`concept-row ${lesson.status}`} key={lesson.id}>
            <span className="concept-index">{String(index + 1).padStart(2, "0")}</span>
            <div className="concept-main"><h3>{lesson.title}</h3><p>{lesson.outcome}</p></div>
            <p className="concept-transfer">{lesson.transfer}</p>
            <span className="concept-status">{lesson.statusLabel}</span>
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
  const [expanded, setExpanded] = useState<string | null>(reviewItems[0]?.id ?? null);

  return (
    <section className="flat-surface">
      <div className="surface-heading">
        <div><p className="kicker">RETRIEVAL PRACTICE</p><h2>Ôn để kiến thức còn dùng được</h2></div>
        <span>{reviewItems.length} concepts</span>
      </div>
      <p className="surface-intro">Không đọc lại lời giải. Hãy thử kéo kiến thức ra khỏi trí nhớ trong một bối cảnh mới.</p>
      <div className="review-ledger">
        {reviewItems.map((lesson, index) => {
          const isOpen = expanded === lesson.id;
          return (
            <article className={isOpen ? "review-row open" : "review-row"} key={lesson.id}>
              <div className="review-when"><strong>{index === 0 ? "Hôm nay" : `+${index * 2 + 1} ngày`}</strong><span>{index === 0 ? "Đã đến hạn" : "Đã lên lịch"}</span></div>
              <div className="review-main"><h3>{lesson.title}</h3><p>{lesson.transfer}</p></div>
              <button onClick={() => setExpanded(isOpen ? null : lesson.id)} aria-expanded={isOpen}>
                {isOpen ? "Thu gọn" : "Xem bằng chứng"}
              </button>
              {isOpen ? (
                <div className="review-evidence">
                  <span>Không gợi ý</span><span>Bối cảnh mới</span><span>Giải thích bằng lời</span>
                  <p>Lần đúng gần nhất sẽ không được hiển thị trước khi ông trả lời.</p>
                </div>
              ) : null}
            </article>
          );
        })}
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
        <p className="brand-caption">THINKING WORKBENCH</p>
        <nav aria-label="Điều hướng chính">
          {navItems.map((item, index) => (
            <button
              key={item.id}
              className={view === item.id ? "nav-button active" : "nav-button"}
              onClick={() => { setView(item.id); setShowLab(false); }}
              title={item.hint}
            >
              <span className="nav-number">0{index + 1}</span><span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="streak">07</span>
          <div><strong>Ngày liên tiếp</strong><span>Nhịp nhỏ, bằng chứng thật</span></div>
        </div>
      </aside>

      <div className="workspace" id="top">
        {!showLab ? (
          <header className="topbar">
            <div>
              <p className="date-label">THỨ BA · 25.08.2026</p>
              <h1>{view === "today" ? "Hôm nay chỉ cần làm rõ một ý tưởng." : view === "map" ? "Bản đồ năng lực" : "Ôn tập chủ động"}</h1>
            </div>
            <div className="profile-chip" aria-label="Hồ sơ người học">
              <span className="profile-avatar">PL</span>
              <div><strong>Thiên Lộc</strong><span>AI · Data path</span></div>
            </div>
          </header>
        ) : null}

        {showLab ? <MiniLab onClose={() => setShowLab(false)} /> : null}
        {!showLab && view === "today" ? <TodayView onStart={() => setShowLab(true)} /> : null}
        {!showLab && view === "map" ? <MapView /> : null}
        {!showLab && view === "review" ? <ReviewView /> : null}
      </div>
    </main>
  );
}
