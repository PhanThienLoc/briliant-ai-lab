"use client";

import { useState } from "react";
import { useAiSettings } from "./ai-context";
import "../../app/ai-settings.css";

export function AiSettings() {
  const { config, setConfig } = useAiSettings();
  const [showKey, setShowKey] = useState(false);
  const [notice, setNotice] = useState("");
  const ready = Boolean(config.apiKey.trim()) && (config.provider !== "gemini" || config.geminiFreeTier);

  function chooseProvider(provider: "openrouter" | "gemini") {
    setConfig({
      provider, model: provider === "openrouter" ? "openrouter/free" : "gemini-2.5-flash-lite",
      apiKey: "", geminiFreeTier: false,
    });
    setShowKey(false);
    setNotice("Đã đổi nhà cung cấp. Nhập key tương ứng; ứng dụng chưa gửi yêu cầu nào.");
  }

  return <section className="ai-settings" aria-labelledby="ai-settings-heading">
    <header className="template-page-header"><span className="studio-eyebrow">AI THEO LỰA CHỌN CỦA ÔNG</span><h1 id="ai-settings-heading">Cài đặt AI</h1><p>Nhập API key của ông để tạo bài học từ những đoạn nguồn đã chọn.</p></header>
    <div className="ai-settings-grid">
      <section className="ai-settings-card" aria-labelledby="ai-provider-heading">
        <h2 id="ai-provider-heading">Kết nối nhà cung cấp</h2>
        <label>Nhà cung cấp<select value={config.provider} onChange={(event) => chooseProvider(event.target.value as "openrouter" | "gemini")}><option value="openrouter">OpenRouter · tuyến model miễn phí</option><option value="gemini">Gemini · dự án Free Tier</option></select></label>
        <p className="ai-settings-model">Model: <code>{config.model}</code></p>
        {config.provider === "openrouter" ? <p>Chỉ dùng tuyến <code>openrouter/free</code>, giới hạn giá bằng 0. Hết quota hoặc không có model phù hợp sẽ báo lỗi; không tự chuyển sang model trả phí.</p> : <>
          <p>Gemini có Free Tier theo dự án và quota riêng. Ứng dụng không đọc được trạng thái billing của dự án chỉ từ API key.</p>
          <label className="ai-settings-consent"><input type="checkbox" checked={config.geminiFreeTier} onChange={(event) => setConfig((current) => ({ ...current, geminiFreeTier: event.target.checked }))} /><span>Tôi xác nhận key thuộc dự án Free Tier và chưa bật billing. Nếu dự án đã bật billing, tôi sẽ không dùng key đó trong ứng dụng.</span></label>
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">Kiểm tra dự án và API key trong Google AI Studio ↗</a>
        </>}
        <label htmlFor="ai-api-key">API key · chỉ giữ trong tab này</label>
        <input id="ai-api-key" type={showKey ? "text" : "password"} autoComplete="off" autoCapitalize="none" spellCheck={false} value={config.apiKey} onChange={(event) => { setConfig((current) => ({ ...current, apiKey: event.target.value })); setNotice(""); }} placeholder="Dán API key của nhà cung cấp đã chọn" aria-describedby="ai-key-help" />
        <div className="ai-settings-actions"><button className="studio-extract" type="button" aria-pressed={showKey} onClick={() => setShowKey((current) => !current)}>{showKey ? "Ẩn API key" : "Hiện API key"}</button><button className="studio-extract" type="button" disabled={!config.apiKey} onClick={() => { setConfig((current) => ({ ...current, apiKey: "" })); setShowKey(false); setNotice("Đã quên API key trong tab này."); }}>Quên API key</button></div>
        <p id="ai-key-help">Key chỉ nằm trong bộ nhớ của tab, mất khi tải lại hoặc đóng trang. Không lưu vào localStorage, Passport, bản nháp hoặc mã nguồn.</p>
        <p role="status" className="ai-settings-status">{notice || (ready ? "Đã nhập cấu hình. Chưa gửi yêu cầu và chưa xác minh key với nhà cung cấp." : "Chưa sẵn sàng. Nhập key và xác nhận Free Tier nếu chọn Gemini.")}</p>
      </section>
      <aside className="ai-settings-card" aria-labelledby="ai-sharing-heading">
        <h2 id="ai-sharing-heading">Ông kiểm soát mỗi lần gửi</h2>
        <ol><li>Chọn những mục nguồn muốn dùng.</li><li>Xem lại trích đoạn và yêu cầu sẽ gửi.</li><li>Xác nhận trước từng yêu cầu tạo bài.</li><li>Duyệt kết quả có dẫn chứng trước khi lưu.</li></ol>
        <p>Trích đoạn đã chọn và API key được chuyển qua máy chủ ứng dụng tới đúng nhà cung cấp. Key không được lưu lâu dài; không có lời gọi kiểm tra key ngầm khi mở Cài đặt.</p>
        <p>Quota miễn phí và chính sách dữ liệu do nhà cung cấp quy định. Nguồn gửi tới dịch vụ miễn phí có thể được xử lý hoặc lưu theo chính sách của dịch vụ đó.</p>
        <div className="ai-settings-links"><a href="https://openrouter.ai/settings/keys" target="_blank" rel="noopener noreferrer">API key OpenRouter ↗</a><a href="https://openrouter.ai/docs/guides/routing/routers/free-router" target="_blank" rel="noopener noreferrer">Tuyến miễn phí OpenRouter ↗</a><a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer">Free Tier và billing của Gemini ↗</a></div>
        <p>Chưa thêm endpoint tùy chỉnh trong bản thử này để tránh gửi nhầm key hoặc nguồn tới địa chỉ không được kiểm tra.</p>
      </aside>
    </div>
  </section>;
}
