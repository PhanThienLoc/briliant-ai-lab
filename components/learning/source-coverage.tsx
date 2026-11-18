"use client";

import { useEffect, useRef, useState } from "react";
import { readCoverageDrafts, saveCoverageDraft, deleteCoverageDraft, type CoverageDraft } from "../../lib/source-draft-store";
import { formatLocator } from "../../lib/source-document";
import { toPracticeCourse } from "../../lib/coverage-practice";
import type { SourceCourse } from "../../lib/source-course";
import "../../app/source-coverage.css";

export function SourceCoverage({ value, onChange, onPractice }: {
  value: CoverageDraft | null;
  onChange: (draft: CoverageDraft) => void;
  onPractice: (course: SourceCourse) => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const documentId = value?.id;
  useEffect(() => { if (documentId) heading.current?.focus(); }, [documentId]);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState<CoverageDraft[]>([]);
  function load() {
    const result = readCoverageDrafts(() => window.localStorage);
    setMessage(result.error || (result.drafts?.length ? "Chọn một bản nháp để tiếp tục." : "Chưa có bản nháp độ phủ đã lưu."));
    setSaved(result.drafts ?? []);
  }
  function remove(id: string) {
    if (!window.confirm("Xóa bản nháp độ phủ này khỏi thiết bị? Hãy sao lưu Passport nếu muốn giữ lại.")) return;
    try { deleteCoverageDraft(window.localStorage, id); load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Không thể xóa bản nháp."); }
  }
  function save() {
    if (!value) return;
    try { saveCoverageDraft(window.localStorage, { ...value, updatedAt: new Date().toISOString() }); setMessage("Đã lưu toàn bộ mục và lựa chọn trên thiết bị. Thay đổi sau đó cần lưu lại."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Chưa thể lưu bản nháp."); }
  }
  function practice() {
    if (!value) return;
    try { onPractice(toPracticeCourse(value)); setMessage("Đã tạo bản xem trước. Kiểm tra câu hỏi bên trên trước khi lưu vào thư viện."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Chưa thể tạo bài từ các mục này."); }
  }
  return <section className="source-coverage" aria-labelledby="coverage-heading">
    <header><div><span className="studio-eyebrow">TOÀN BỘ PHẦN NGUỒN ĐÃ NHẬP</span><h2 id="coverage-heading" ref={heading} tabIndex={-1}>Bản đồ độ phủ tài liệu</h2></div><button className="studio-extract" onClick={load}>Mở bản nháp độ phủ</button></header>
    {message ? <p role="status" className="studio-message">{message}</p> : null}
    {saved.length ? <ul className="coverage-saved">{saved.map((draft) => <li key={draft.id}><button className="studio-extract" onClick={() => { onChange(draft); setSaved([]); setMessage("Đã khôi phục toàn bộ mục và lựa chọn. Nguồn gốc không được tự tải lại."); }}>{draft.title || draft.document.name} · {draft.document.sections.length} mục</button><button className="studio-extract" aria-label={`Xóa bản nháp ${draft.title || draft.document.name}`} onClick={() => remove(draft.id)}>Xóa</button></li>)}</ul> : null}
    {value ? <>
      <label>Tên bản nháp<input value={value.title} maxLength={100} onChange={(event) => onChange({ ...value, title: event.target.value })} /></label>
      <p>{value.document.sections.length} mục trong phần nguồn đã nhập · {value.selectedSectionIds.length} mục được chọn.</p>
      <p>Đã xử lý {value.coverage.processedUnits}/{value.coverage.selectedUnits} đơn vị nguồn. Không có chữ: {value.coverage.emptyUnits.length ? value.coverage.emptyUnits.join(", ") : "không ghi nhận"}.</p>
      {value.coverage.truncated ? <p className="studio-message">Nguồn bị cắt ở giới hạn ký tự. Đơn vị cuối: {value.coverage.lastProcessedUnit}. Phần còn lại chưa được đọc; hãy nhập một khoảng nhỏ hơn.</p> : null}
      <p>Mỗi bài tập dùng tối đa 2.200 ký tự đầu của mục được chọn. Danh sách này giữ phần nguồn đã nhập, không xác nhận khóa học bao phủ mọi kiến thức. Chọn 2–6 mục có đủ văn xuôi để tạo bài tập nhận biết theo nguồn. Lựa chọn lớn hơn vẫn lưu được làm bản nháp.</p>
      <div className="coverage-sections">{value.document.sections.map((section, index) => <article key={section.id}>
        <label><input type="checkbox" checked={value.selectedSectionIds.includes(section.id)} onChange={(event) => onChange({ ...value, selectedSectionIds: event.target.checked ? [...value.selectedSectionIds, section.id] : value.selectedSectionIds.filter((id) => id !== section.id) })} /><strong>Mục {index + 1} · {formatLocator(section.locator)}</strong></label>
        <details><summary>Xem nội dung mục {index + 1}</summary><p>{section.text}</p></details>
      </article>)}</div>
      <footer><button className="studio-extract" onClick={save}>Lưu bản nháp độ phủ</button><button className="studio-button" disabled={value.selectedSectionIds.length < 2 || value.selectedSectionIds.length > 6} onClick={practice}>Tạo bài tập từ {value.selectedSectionIds.length} mục →</button></footer>
    </> : <p>Thêm nguồn rồi chọn “Xem bản nháp” để thấy các mục theo trang, tiêu đề hoặc mốc thời gian. Bản nháp bài tập cũ vẫn có thể khôi phục riêng.</p>}
  </section>;
}
