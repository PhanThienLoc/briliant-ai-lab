"use client";

import { useEffect, useRef, useState } from "react";
import { buildSourceCourse, completeSourceLesson, finalizeSourceDraft, MAX_SOURCE_CHARS, parseSourceCourses, SOURCE_COURSES_KEY, type SourceCourse, type SourceKind } from "../lib/source-course";
import { sourcePdfError } from "../lib/pdf-error";
import { MAX_PDF_PAGES, resolvePdfPageRange } from "../lib/pdf-page-range";

import { CourseLibrary, sourceKindLabels as kindLabels } from "../components/learning/course-library";
import type { ExpansionLabId } from "../lib/expansion-catalog";
const currentTime = () => Date.now();

async function readSourceFile(file: File, firstPage: string, lastPage: string): Promise<string> {
  const isPdf = /\.pdf$/i.test(file.name);
  if (file.size > (isPdf ? 30 : 15) * 1024 * 1024) throw new Error(`Tệp vượt ${isPdf ? 30 : 15} MB. Hãy chọn một tệp nhỏ hơn.`);
  if (isPdf) {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise.catch((error: unknown) => { throw sourcePdfError(error); });
    try {
      const range = resolvePdfPageRange(firstPage, lastPage, pdf.numPages);
      const pages: string[] = [];
      for (let pageNumber = range.first; pageNumber <= range.last; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const text = content.items.map((item) => "str" in item ? item.str : "").join(" ").trim();
        if (text) pages.push(`Trang ${pageNumber}\n${text}`);
        if (pages.join("\n\n").length >= MAX_SOURCE_CHARS) break;
      }
      if (!pages.length) throw new Error("PDF này không có lớp chữ để trích xuất. Hãy dùng bản OCR hoặc dán văn bản.");
      return pages.join("\n\n").slice(0, MAX_SOURCE_CHARS);
    } finally {
      await pdf.destroy();
    }
  }
  if (!/\.(txt|md|markdown|srt|vtt)$/i.test(file.name)) throw new Error("Hỗ trợ PDF có lớp chữ, TXT, Markdown, SRT và VTT.");
  return (await file.text()).slice(0, MAX_SOURCE_CHARS + 1);
}

type SourceStudioProps = {
  mode?: "library" | "create";
  navigationId?: number;
  visible?: boolean;
  libraryRevision?: number;
  initialCourseId?: string | null; initialLessonId?: string | null;
  onCreate?: () => void; onLibrary?: () => void;
  onLesson?: (lessonId: string) => void; onTrack?: (labId: ExpansionLabId) => void;
};

export function SourceStudio({ mode = "create", navigationId, visible = true, libraryRevision = 0, initialCourseId, initialLessonId, onCreate, onLibrary, onLesson, onTrack }: SourceStudioProps) {
  const [courses, setCourses] = useState<SourceCourse[]>([]);
  const [hydrated, setHydrated] = useState(false);
  // Route effects read the latest committed records without resetting a learner's answer after each save.
  const savedCourses = useRef<SourceCourse[]>([]);
  const [storageError, setStorageError] = useState("");
  const [missingTarget, setMissingTarget] = useState("");
  const [now, setNow] = useState(0);
  const [kind, setKind] = useState<SourceKind>("book");
  const [title, setTitle] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [text, setText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [firstPage, setFirstPage] = useState("1");
  const [lastPage, setLastPage] = useState("");
  const [needsExtract, setNeedsExtract] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [lessonIndex, setLessonIndex] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "retry" | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState<SourceCourse | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [edits, setEdits] = useState<Record<string, { title: string; objective: string }>>({});
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const saved = parseSourceCourses(window.localStorage.getItem(SOURCE_COURSES_KEY) ?? "[]");
        savedCourses.current = saved;
        setCourses(saved);
        setStorageError("");
      } catch {
        setStorageError("Không đọc được thư viện: bộ nhớ bị chặn hoặc dữ liệu không hợp lệ. Dữ liệu cũ chưa bị ghi đè. Hãy kiểm tra quyền lưu trữ hoặc khôi phục Learning Passport rồi tải lại trang.");
      }
      setHydrated(true);
      setNow(currentTime());
    });
    return () => { cancelled = true; };
  }, [libraryRevision]);

  useEffect(() => {
    if (!hydrated) return;
    queueMicrotask(() => {
      setChoice(null); setFeedback(null); setMissingTarget("");
      setNow(currentTime());
      if (mode !== "library" || !initialCourseId) { setActiveId(null); setLessonIndex(0); return; }
      const course = savedCourses.current.find((item) => item.id === initialCourseId);
      const index = initialLessonId ? course?.lessons.findIndex((item) => item.id === initialLessonId) ?? -1 : 0;
      if (!course || index < 0) {
        setActiveId(null); setLessonIndex(-1);
        setMissingTarget("Không tìm thấy đúng khóa học hoặc bài học được yêu cầu trên thiết bị này. Hãy kiểm tra thư viện hoặc khôi phục Learning Passport.");
        return;
      }
      setActiveId(course.id); setLessonIndex(index);
    });
  }, [hydrated, mode, navigationId, initialCourseId, initialLessonId, libraryRevision]);

  const active = courses.find((course) => course.id === activeId);
  const lesson = active?.lessons[lessonIndex];
  const isReview = Boolean(lesson?.completedAt && lesson.reviewDueAt && Date.parse(lesson.reviewDueAt) <= now && !lesson.reviewedAt);
  const completed = active?.lessons.filter((item) => item.completedAt).length ?? 0;
  const readerHeading = useRef<HTMLHeadingElement>(null);
  const studioHeading = useRef<HTMLHeadingElement>(null);
  const readerWasOpen = useRef(false);
  const readerKey = mode === "library" && active && lesson ? `${active.id}:${lesson.id}` : null;
  useEffect(() => {
    if (!visible) return;
    if (readerKey) {
      readerHeading.current?.focus();
      readerWasOpen.current = true;
    } else if (readerWasOpen.current) {
      studioHeading.current?.focus();
      readerWasOpen.current = false;
    }
  }, [readerKey, visible]);

  function persist(next: SourceCourse[]) {
    if (!hydrated || storageError) { setMessage("Chưa thể lưu khi thư viện chưa đọc được. Bản nháp và dữ liệu trước đó được giữ nguyên."); return false; }
    try {
      window.localStorage.setItem(SOURCE_COURSES_KEY, JSON.stringify(next));
      savedCourses.current = next;
      setCourses(next);
      return true;
    } catch {
      setMessage("Không thể lưu: bộ nhớ trình duyệt đã đầy hoặc bị chặn. Hãy xuất bớt dữ liệu hoặc dùng trình duyệt khác.");
      return false;
    }
  }

  async function extractFile() {
    if (!selectedFile) return;
    setBusy(true); setMessage("");
    try {
      const content = await readSourceFile(selectedFile, firstPage, lastPage);
      setText(content);
      setNeedsExtract(false);
      setSourceName(selectedFile.name);
      if (!title) setTitle(selectedFile.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
      setMessage(`Đã trích xuất ${content.length.toLocaleString("vi-VN")} ký tự từ ${selectedFile.name}. Hãy xem lại nội dung trước khi tạo.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không đọc được tệp."); }
    finally { setBusy(false); }
  }

  function create() {
    setMessage("");
    try {
      if (sourceUrl && !/^https?:\/\/\S+$/i.test(sourceUrl)) throw new Error("Liên kết nguồn cần bắt đầu bằng http:// hoặc https://.");
      const course = buildSourceCourse({ title, kind, text, sourceName: sourceName || sourceUrl || "Nguồn do người học cung cấp", sourceUrl });
      setDraft(course); setSelectedIds(course.lessons.map((item) => item.id)); setEdits({});
      setMessage("Bản nháp chưa lưu. Xem từng đoạn, chỉnh mục tiêu và chọn ít nhất 2 bài trong phần duyệt bản nháp.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Chưa thể tạo khóa học."); }
  }

  function saveDraft() {
    if (!draft) return;
    try {
      if (courses.length >= 20) throw new Error("Thư viện đã có 20 khóa. Hãy sao lưu và xóa một khóa trước khi lưu thêm.");
      const course = finalizeSourceDraft(draft, selectedIds, edits);
      if (!persist([course, ...courses])) return;
      setActiveId(course.id); setLessonIndex(0); setChoice(null); setFeedback(null); setDraft(null);
      setMessage(`Đã lưu lộ trình ${course.lessons.length} bài. Mỗi bài giữ nguyên đoạn nguồn và vị trí dẫn chứng.`);
      onLibrary?.();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Chưa thể lưu bản nháp."); }
  }

  function chooseCourse(course: SourceCourse, index = 0) {
    setNow(currentTime());
    setActiveId(course.id); setLessonIndex(index); setChoice(null); setFeedback(null); setMissingTarget(""); setMessage("");
  }

  function submit() {
    if (!active || !lesson || choice === null) return;
    if (choice !== (isReview ? lesson.reviewAnswer : lesson.answer)) { setFeedback("retry"); return; }
    try {
      const updated = completeSourceLesson(active, lesson.id, new Date(), isReview);
      if (persist(courses.map((course) => course.id === active.id ? updated : course))) setFeedback("correct");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Chưa thể lưu kết quả. Dữ liệu cũ chưa bị thay đổi.");
    }
  }

  function removeCourse(course: SourceCourse) {
    if (!window.confirm(`Xóa khóa học “${course.title}” và tiến độ trên thiết bị này? Hãy sao lưu Learning Passport trước nếu muốn giữ lại.`)) return;
    if (persist(courses.filter((item) => item.id !== course.id)) && activeId === course.id) setActiveId(null);
  }

  return <div className="source-studio">
    <header className="studio-heading"><div><span className="studio-eyebrow">{mode === "library" ? "HỌC TỪ NGUỒN · TRÊN THIẾT BỊ NÀY" : "TỪ NGUỒN ĐẾN HIỂU BIẾT"}</span><h1 ref={studioHeading} tabIndex={-1}>{mode === "library" ? "Thư viện của ông" : "Tạo khóa học"}</h1><p>{mode === "library" ? "Tiếp tục một khóa đã lưu hoặc khám phá các lộ trình AI & Data." : "Chọn nguồn, xem lại từng bài và lưu một lộ trình có dẫn chứng."}</p></div>{mode === "create" && onLibrary ? <button className="studio-extract" onClick={onLibrary}>Mở thư viện →</button> : null}</header>
    {message ? <p className="studio-message" role="status">{message}</p> : null}
    {missingTarget && mode === "library" ? <p className="studio-message" role="alert">{missingTarget}</p> : null}
    {mode === "library" && !active ? <CourseLibrary courses={courses} hydrated={hydrated} storageError={storageError} onOpen={chooseCourse} onRemove={removeCourse} onCreate={onCreate} onLesson={onLesson} onTrack={onTrack} /> : null}
    <div className="studio-layout create-layout" hidden={mode !== "create"} inert={mode !== "create"} style={mode !== "create" ? { display: "none" } : undefined}>
      <section className="studio-form" aria-labelledby="studio-form-heading">
        <div className="studio-section-head"><span>BƯỚC 1 · CHỌN NGUỒN</span><h2 id="studio-form-heading">Ông muốn học từ đâu?</h2></div>
        <label>Loại nguồn<select value={kind} onChange={(event) => setKind(event.target.value as SourceKind)}>{Object.entries(kindLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label>Tên khóa học<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ví dụ: Hiểu căn bản về attention" maxLength={100} /></label>
        <label>Văn bản hoặc PDF<input type="file" accept=".pdf,.txt,.md,.markdown,.srt,.vtt" onChange={(event) => { setSelectedFile(event.target.files?.[0] ?? null); setNeedsExtract(Boolean(event.target.files?.[0])); setText(""); setMessage(""); }} disabled={busy} /></label>
        {selectedFile && /\.pdf$/i.test(selectedFile.name) ? <div className="studio-two"><label>Trang bắt đầu<input type="number" min="1" step="1" value={firstPage} onChange={(event) => { setFirstPage(event.target.value); setNeedsExtract(true); setText(""); }} /></label><label>Trang kết thúc (để trống: tối đa {MAX_PDF_PAGES} trang)<input type="number" min="1" step="1" value={lastPage} onChange={(event) => { setLastPage(event.target.value); setNeedsExtract(true); setText(""); }} /></label></div> : null}
        {selectedFile ? <button className="studio-extract" type="button" onClick={() => void extractFile()} disabled={busy}>{busy ? "Đang trích xuất…" : "Trích xuất tệp →"}</button> : null}
        <div className="studio-two"><label>Tên nguồn<input value={sourceName} onChange={(event) => setSourceName(event.target.value)} placeholder="Tác giả, tên sách hoặc video" maxLength={160} /></label><label>Liên kết gốc (tùy chọn)<input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://..." /></label></div>
        <label>Nội dung để học<textarea value={text} onChange={(event) => { setText(event.target.value); setNeedsExtract(false); }} placeholder={kind === "video" ? "Dán transcript của video vào đây..." : "Dán văn bản từ nguồn vào đây hoặc trích xuất tệp ở trên..."} rows={8} maxLength={MAX_SOURCE_CHARS + 1} /></label>
        <div className="studio-form-foot"><span>{text.length.toLocaleString("vi-VN")} / {MAX_SOURCE_CHARS.toLocaleString("vi-VN")} ký tự</span><button className="studio-button" onClick={create} disabled={busy || needsExtract || text.length < 400}>{busy ? "Đang đọc…" : "Xem bản nháp →"}</button></div>
        <p className="studio-disclosure">Nguồn và khóa học được xử lý trên thiết bị này. PDF có lớp chữ cho chọn tối đa 60 trang mỗi lượt (tệp tối đa 30 MB), khóa học lấy mẫu tối đa 6 đoạn và không bao phủ toàn bộ sách. Markdown chia theo tiêu đề mục; SRT/VTT giữ mốc thời gian của đoạn được chọn. Liên kết chỉ lưu để dẫn nguồn; URL không tự tải nội dung. Video cần transcript; PDF scan cần OCR hoặc dán văn bản. Hãy kiểm tra câu hỏi và bản quyền nguồn trước khi dùng.</p>
        {storageError ? <p className="studio-message" role="alert">{storageError}</p> : null}
      </section>
    {draft ? <section className="studio-draft" aria-labelledby="studio-draft-title">
      <header><span className="studio-eyebrow">DUYỆT TRƯỚC KHI LƯU · CHƯA LƯU</span><h2 id="studio-draft-title">Duyệt bản nháp</h2><label>Tên khóa học trong bản nháp<input value={draft.title} maxLength={100} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label><p>{selectedIds.length}/{draft.lessons.length} bài được chọn · {draft.sourceName}</p><p>Đây là các đoạn mẫu từ nguồn, chưa phải khóa học bao phủ toàn bộ tài liệu. Chọn bài hữu ích và viết mục tiêu ông muốn tự giải thích được.</p></header>
      <div className="studio-draft-list">{draft.lessons.map((item, index) => {
        const edit = edits[item.id] ?? { title: item.title, objective: item.objective };
        return <article key={item.id} className={selectedIds.includes(item.id) ? "included" : ""}>
          <label className="studio-draft-select"><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={(event) => setSelectedIds((ids) => event.target.checked ? [...ids, item.id] : ids.filter((id) => id !== item.id))} />Giữ bài {index + 1} · {item.sourceLocation}</label>
          <label>Tên bài {index + 1}<input value={edit.title} maxLength={100} onChange={(event) => setEdits((current) => ({ ...current, [item.id]: { ...edit, title: event.target.value } }))} /></label>
          <label>Mục tiêu bài {index + 1}<textarea rows={2} value={edit.objective} maxLength={300} onChange={(event) => setEdits((current) => ({ ...current, [item.id]: { ...edit, objective: event.target.value } }))} /></label>
          <details><summary>Đối chiếu đoạn nguồn và câu hỏi bài {index + 1}</summary><blockquote>{item.excerpt}</blockquote><strong>{item.question}</strong><ol>{item.options.map((option, optionIndex) => <li key={optionIndex}>{option}{optionIndex === item.answer ? " — Đáp án theo nguồn" : ""}</li>)}</ol><p><strong>Bài ôn sau 72 giờ:</strong> {item.reviewOptions[item.reviewAnswer]}</p><small>Câu hỏi kiểm tra nhận biết ý trong nguồn; mục tiêu tự giải thích do ông đặt chưa được chấm tự động.</small></details>
        </article>;
      })}</div>
      <footer><span>Bản nháp được giữ khi chuyển mục trong ứng dụng, nhưng sẽ mất nếu tải lại hoặc đóng trang. Thư viện cũ chỉ thay đổi khi lưu thành công.</span><button className="studio-extract" onClick={() => setDraft(null)}>Bỏ bản nháp</button><button className="studio-button" disabled={!hydrated || Boolean(storageError) || selectedIds.length < 2 || !draft.title.trim()} onClick={saveDraft}>Lưu {selectedIds.length} bài vào thư viện →</button></footer>
    </section> : <aside className="studio-preview-empty"><span className="studio-eyebrow">BƯỚC 2 · DUYỆT & LƯU</span><h2>Bản nháp xuất hiện ở đây</h2><p>Thêm nội dung nguồn rồi chọn “Xem bản nháp”. Ông có thể sửa tên, mục tiêu và chọn ít nhất 2 bài để lưu.</p><div className="draft-steps"><p><b>01</b> Đối chiếu đoạn trích và câu hỏi</p><p><b>02</b> Viết mục tiêu tự giải thích</p><p><b>03</b> Lưu khi đã sẵn sàng</p></div><p className="studio-disclosure">Xử lý cục bộ, lấy mẫu tối đa 6 đoạn. Các mục tiêu do ông viết chưa được chấm tự động.</p></aside>}
    </div>
    {mode === "library" && active && lesson ? <section className="studio-reader" aria-labelledby="studio-course-heading"><button className="back-link" onClick={() => { setActiveId(null); setChoice(null); setFeedback(null); }}>← Tất cả khóa học</button><div className="studio-reader-head"><div><span className="studio-eyebrow">03 / HỌC TỪ NGUỒN</span><h2 id="studio-course-heading">{active.title}</h2><p>{completed}/{active.lessons.length} bài đã học · Nguồn: {active.sourceName}</p></div>{active.sourceUrl ? <a href={active.sourceUrl} target="_blank" rel="noopener noreferrer">Mở nguồn ↗</a> : null}</div><div className="studio-lesson-tabs" role="group" aria-label="Chọn bài học">{active.lessons.map((item, index) => <button key={item.id} className={lessonIndex === index ? "active" : ""} onClick={() => chooseCourse(active, index)} aria-current={lessonIndex === index ? "step" : undefined}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.title}</strong>{item.reviewedAt ? <small>Đã ôn</small> : item.completedAt ? <small>Đã học</small> : null}</button>)}</div><article className="studio-lesson"><div className="studio-lesson-meta"><span>BÀI {lessonIndex + 1} / {active.lessons.length}</span><span>{isReview ? "ÔN ĐẾN HẠN" : lesson.completedAt ? "ĐÃ HỌC" : "ĐANG HỌC"}</span></div><h3 ref={readerHeading} tabIndex={-1}>{lesson.title}</h3><p>{lesson.objective}</p><blockquote><span>TRÍCH ĐOẠN NGUỒN · {lesson.sourceLocation}</span>{lesson.excerpt}</blockquote><div className="studio-question"><h4>{isReview ? "Bài biến thể đến hạn" : "Kiểm tra hiểu"}</h4><p>{isReview ? "Trong phần nguồn này, kết luận hoặc hệ quả nào được nêu?" : lesson.question}</p><div className="studio-options">{(isReview ? lesson.reviewOptions : lesson.options).map((option, index) => <button key={`${lesson.id}-${index}`} onClick={() => { setChoice(index); setFeedback(null); }} aria-pressed={choice === index} className={choice === index ? "selected" : ""}><b>{String.fromCharCode(65 + index)}</b>{option}</button>)}</div><div className="studio-answer"><button className="studio-button" disabled={choice === null || feedback === "correct" || (Boolean(lesson.completedAt) && !isReview)} onClick={submit}>{feedback === "correct" ? "Đã lưu ✓" : isReview ? "Nộp bài ôn" : "Kiểm tra đáp án"}</button>{feedback === "retry" ? <p role="status">Chưa khớp đoạn nguồn. Đọc lại phần trích và thử đáp án khác.</p> : feedback === "correct" ? <p role="status">Đúng theo nguồn. {lesson.reviewedAt ? "Đã ghi nhận lần ôn." : "Lịch ôn được mở sau 72 giờ."}</p> : lesson.completedAt && !isReview ? <p>{lesson.reviewedAt ? "Đã hoàn thành lần ôn." : `Ôn sau ${new Date(lesson.reviewDueAt!).toLocaleString("vi-VN")}.`}</p> : null}</div></div></article></section> : null}
  </div>;
}
