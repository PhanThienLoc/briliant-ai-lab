"use client";

import type { TodayQueue, TodayQueueItem } from "../../lib/today-queue";

export function TodaySession({
  queue,
  onOpen,
  onDiagnostic,
}: {
  queue: TodayQueue;
  onOpen: (item: TodayQueueItem) => void;
  onDiagnostic: () => void;
}) {
  return (
    <section className="today-session" aria-labelledby="today-session-title">
      <header>
        <div>
          <span className="mono-label">TODAY / {queue.budgetMinutes} PHÚT</span>
          <h2 id="today-session-title">Phiên học có chủ đích</h2>
        </div>
        <strong aria-label={`${queue.totalMinutes} trên ${queue.budgetMinutes} phút`}>
          {queue.totalMinutes}/{queue.budgetMinutes} phút
        </strong>
      </header>

      {queue.items.length ? (
        <ol className="today-actions">
          {queue.items.map((item, index) => (
            <li key={item.id} className={index === 0 ? "today-lead" : undefined}>
              <button
                className="today-action"
                aria-current={index === 0 ? "step" : undefined}
                aria-label={`${index + 1}. ${item.title}. ${item.reason}. ${item.minutes} phút. Bằng chứng cần tạo: ${item.evidenceNeeded}`}
                disabled={!item.target}
                onClick={() => item.target && onOpen(item)}
              >
                <span className="today-order">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>
                  <small>
                    {item.type} · {item.minutes} phút
                  </small>
                  <strong>{item.title}</strong>
                  <span className="today-reason">
                    <b>Vì sao chọn bài này:</b> {item.reason}
                  </span>
                  <span className="today-evidence">
                    Bằng chứng cần tạo: {item.evidenceNeeded}
                  </span>
                  {index === 0 && item.target ? <span className="today-continue">Tiếp tục học →</span> : null}
                </span>
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <div className="queue-empty">
          <strong>Chưa có hành động phù hợp.</strong>
          <p>Hoàn thành diagnostic để hệ thống tìm điểm bắt đầu.</p>
          <button className="primary-action" onClick={onDiagnostic}>Tìm điểm bắt đầu →</button>
        </div>
      )}
    </section>
  );
}
