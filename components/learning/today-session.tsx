"use client";

import type { TodayQueue, TodayQueueItem } from "../../lib/today-queue";

const actionLabels: Record<TodayQueueItem["type"], string> = {
  review: "Ôn tập", repair: "Sửa lỗi hiểu", bridge: "Bài nối", practice: "Luyện tập", new: "Bài mới", reflection: "Tự phản tư",
};

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
          <span className="mono-label">LỘ TRÌNH HÔM NAY</span>
          <h2 id="today-session-title">Phiên học có chủ đích</h2>
        </div>
        <strong aria-label={`${queue.totalMinutes} trên ${queue.budgetMinutes} phút`}>
          {queue.totalMinutes} / {queue.budgetMinutes} phút dự kiến
        </strong>
      </header>

      {queue.items.length ? (
        <ol className="today-actions">
          {queue.items.map((item, index) => {
            const Action = item.target ? "button" : "div";
            const reasonId = `today-reason-${index}`;
            return (
              <li key={item.id} className={index === 0 ? "today-lead" : undefined}>
                <Action
                  className="today-action"
                  aria-current={index === 0 && item.target ? "step" : undefined}
                  aria-label={item.target ? `${index + 1}. ${item.title}. ${item.minutes} phút. Bằng chứng cần tạo: ${item.evidenceNeeded}` : undefined}
                  aria-describedby={item.target ? reasonId : undefined}
                  onClick={item.target ? () => onOpen(item) : undefined}
                >
                  <span className="today-order">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <small>
                      {actionLabels[item.type]} · {item.minutes} phút
                    </small>
                    <strong>{item.title}</strong>
                    <span className="today-reason" id={reasonId}>
                      <b>Vì sao chọn bài này:</b> {item.reason}
                    </span>
                    <span className="today-evidence">
                      Bằng chứng cần tạo: {item.evidenceNeeded}
                    </span>
                    {index === 0 && item.target ? <span className="today-continue">Tiếp tục học →</span> : null}
                  </span>
                </Action>
              </li>
            );
          })}
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
