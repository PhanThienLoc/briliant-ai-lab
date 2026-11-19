"use client";

import { useEffect, useRef, useState } from "react";
import { completeSourceLesson, finalizeSourceDraft, MIN_SOURCE_CHARS, MAX_SOURCE_CHARS, normalizeSourceText, parseSourceCourses, SOURCE_COURSES_KEY, type SourceCourse, type SourceKind } from "../lib/source-course";
import { readSourceFile, ingestToText, type IngestResult } from "../lib/source-ingest";
import { readSourcePracticeDraft, saveSourcePracticeDraft, clearSourcePracticeDraft } from "../lib/source-practice-draft";
import { MAX_PDF_PAGES } from "../lib/pdf-page-range";

import { CourseLibrary, sourceKindLabels as kindLabels } from "../components/learning/course-library";
import { AiCourseStudio } from "../components/learning/ai-course-studio";
import { SourceCoverage } from "../components/learning/source-coverage";
import { buildSourceDocument, documentFromText } from "../lib/source-document";
import { ingestText } from "../lib/source-ingest";
import type { CoverageDraft } from "../lib/source-draft-store";
import type { ExpansionLabId } from "../lib/expansion-catalog";
const currentTime = () => Date.now();

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
  const [inputMethod, setInputMethod] = useState<"file" | "link" | "text">("file");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [reviewKind, setReviewKind] = useState<"practice" | "ai">("practice");
  const [coverageDraft, setCoverageDraft] = useState<CoverageDraft | null>(null);
  const [coverage, setCoverage] = useState<IngestResult | null>(null);
  const [draftStorageMessage, setDraftStorageMessage] = useState("");
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
  const contentLength = normalizeSourceText(text).length;
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

  useEffect(() => {
    if (!visible || mode !== "library" || activeId || !courses.length) return;
    const timer = window.setInterval(() => setNow(currentTime()), 60_000);
    return () => window.clearInterval(timer);
  }, [visible, mode, activeId, courses.length]);

  const active = courses.find((course) => course.id === activeId);
  const lesson = active?.lessons[lessonIndex];
  const isReview = Boolean(lesson?.completedAt && lesson.reviewDueAt && Date.parse(lesson.reviewDueAt) <= now && !lesson.reviewedAt);
  const answerLocked = feedback === "correct" || (Boolean(lesson?.completedAt) && !isReview);
  const showReviewQuestion = isReview || (feedback === "correct" && Boolean(lesson?.reviewedAt));
  const completed = active?.lessons.filter((item) => item.completedAt).length ?? 0;
  const draftHeading = useRef<HTMLHeadingElement>(null);
  const pendingDraftFocus = useRef(false);
  useEffect(() => {
    if (!draft || !visible || mode !== "create" || !pendingDraftFocus.current) return;
    pendingDraftFocus.current = false;
    draftHeading.current?.focus();
  }, [draft, visible, mode]);
  const readerHeading = useRef<HTMLHeadingElement>(null);
  const studioHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (visible && mode === "create") studioHeading.current?.focus();
  }, [step, visible, mode]);
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

  function keepDraft() {
    if (!draft) return;
    try {
      saveSourcePracticeDraft(window.localStorage, { version: 1, course: draft, selectedIds, edits, updatedAt: new Date().toISOString() });
      setDraftStorageMessage("Đã lưu bản nháp trên thiết bị. Có thể tải lại trang rồi khôi phục.");
    } catch (error) { setDraftStorageMessage(error instanceof Error ? error.message : "Không thể lưu bản nháp."); }
  }

  function resumeDraft() {
    const result = readSourcePracticeDraft(() => window.localStorage);
    if (result.error || !result.draft) { setDraftStorageMessage(result.error || "Chưa có bản nháp đã lưu."); return; }
    const saved = result.draft;
    setStep(3); setReviewKind("practice");
    setDraft(saved.course); setSelectedIds(saved.selectedIds); setEdits(saved.edits);
    pendingDraftFocus.current = true;
    setDraftStorageMessage("Đã khôi phục bản nháp đã lưu. Thay đổi mới cần lưu lại trước khi đóng trang.");
  }

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

  function clearGeneratedDraft() {
    setStep(1); setMessage("");
    setCoverageDraft(null); setDraft(null); setSelectedIds([]); setEdits({});
  }

  async function importArticleLink() {
    if (!sourceUrl.trim() || busy) return;
    if (text.trim() && !window.confirm("Đọc link sẽ thay nội dung nguồn đang nhập. Bản nháp đã lưu vẫn được giữ. Tiếp tục?")) return;
    setBusy(true); setMessage("");
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch("/api/source-url", {method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:sourceUrl.trim()}),signal:controller.signal});
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Phản hồi đọc bài viết không hợp lệ.");
      const result=payload as Record<string,unknown>;
      if (!response.ok) throw new Error(typeof result.error==="string"?result.error:"Không đọc được bài viết.");
      if(typeof result.text!=="string"||!result.text.trim()||result.text.length>MAX_SOURCE_CHARS||typeof result.title!=="string"||typeof result.url!=="string")throw new Error("Văn bản bài viết không hợp lệ.");
      setText(result.text);setSourceName(result.title.slice(0,160));setSourceUrl(result.url);setKind("article");
      if(!title.trim())setTitle(result.title.slice(0,100));
      setSelectedFile(null); setNeedsExtract(false); clearGeneratedDraft();
      setCoverage({...ingestText(result.text),truncated:Boolean(result.truncated)});
      setMessage(result.truncated?"Đã đọc một phần bài viết và cắt ở giới hạn ký tự. Kiểm tra nội dung trước khi gửi AI.":"Đã đọc văn bản bài viết. Kiểm tra nguồn rồi mở bản đồ độ phủ; chưa gửi gì tới AI.");
    } catch(error){setMessage(controller.signal.aborted?"Đọc link quá thời gian. Nội dung cũ chưa bị thay đổi.":error instanceof Error?error.message:"Không đọc được bài viết.");}
    finally{window.clearTimeout(timer);setBusy(false);}
  }

  async function extractFile() {
    if (!selectedFile) return;
    setBusy(true); setMessage("");
    try {
      const result = await readSourceFile(selectedFile, { first: firstPage, last: lastPage });
      const content = ingestToText(result);
      clearGeneratedDraft();
      setCoverage(result);
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
      const id = `source-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
      const name = sourceName || sourceUrl || "Nguồn do người học cung cấp";
      const document = coverage?.blocks.some((block) => block.locator.kind === "page")
        ? buildSourceDocument({ id, name, blocks: coverage.blocks })
        : documentFromText(id, name, text);
      const imported = coverage ?? ingestText(text);
      const { blocks: _blocks, ...counts } = imported;
      void _blocks;
      clearGeneratedDraft();
      setCoverageDraft({ version: 2, id, title, kind, ...(sourceUrl ? { sourceUrl } : {}), document, selectedSectionIds: [], coverage: counts, updatedAt: new Date().toISOString() });
      setStep(2);
      setMessage("Đã giữ đầy đủ các mục trong phần nguồn đã nhập. Chọn mục ở Bản đồ độ phủ tài liệu để tạo bài tập.");

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
    {mode === "create" ? <div className="studio-message"><button className="studio-extract" onClick={resumeDraft}>Khôi phục bản nháp đã lưu</button>{draftStorageMessage ? <p role="status">{draftStorageMessage}</p> : null}</div> : null}
    {message ? <p className="studio-message" role="status">{message}</p> : null}
    {missingTarget && mode === "library" ? <p className="studio-message" role="alert">{missingTarget}</p> : null}
    {mode === "library" && !active ? <CourseLibrary courses={courses} now={now} hydrated={hydrated} storageError={storageError} onOpen={chooseCourse} onRemove={removeCourse} onCreate={onCreate} onLesson={onLesson} onTrack={onTrack} /> : null}
    {mode === "create" && <nav className="studio-steps" aria-label="Quy trình tạo khóa học">{(["Thêm nguồn", "Chọn nội dung", "Duyệt bài"] as const).map((label, index) => <button key={label} aria-current={step === index + 1 ? "step" : undefined} disabled={busy || (index === 1 && !coverageDraft) || (index === 2 && !draft && reviewKind !== "ai")} onClick={() => setStep((index + 1) as 1 | 2 | 3)}>{index + 1}. {label}</button>)}</nav>}
    {mode === "create" && step !== 1 ? <button className="studio-extract" onClick={() => setStep(step === 3 ? 2 : 1)}>Quay lại {step === 3 ? "chọn nội dung" : "nguồn"}</button> : null}
    {mode === "create" && step === 1 ? <div className="studio-resume"><button className="studio-extract" onClick={() => setStep(2)}>Mở bản nháp độ phủ đã lưu</button><button className="studio-extract" onClick={() => { setReviewKind("ai"); setStep(3); }}>Mở khóa AI đã lưu</button></div> : null}
    <div className="studio-layout create-layout" hidden={mode !== "create"} inert={mode !== "create"} style={mode !== "create" ? { display: "none" } : undefined}>
      <section hidden={step !== 1} style={step !== 1 ? { display: "none" } : undefined} className="studio-form" aria-labelledby="studio-form-heading">
        <div className="studio-section-head"><span>BƯỚC 1 · CHỌN NGUỒN</span><h2 id="studio-form-heading">Ông muốn học từ đâu?</h2></div>
        <div className="source-methods" role="group" aria-label="Cách nhập nguồn">{([["file", "PDF hoặc tệp"], ["link", "Liên kết bài viết"], ["text", "Dán văn bản"]] as const).map(([id, label]) => <button type="button" key={id} aria-pressed={inputMethod === id} disabled={busy} onClick={() => setInputMethod(id)}>{label}</button>)}</div>
        <label>Loại nguồn<select value={kind} onChange={(event) => setKind(event.target.value as SourceKind)}>{Object.entries(kindLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label>Tên khóa học<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ví dụ: Hiểu căn bản về attention" maxLength={100} /></label>
        {inputMethod === "file" ? <>
        <label>Văn bản hoặc PDF<input type="file" accept=".pdf,.txt,.md,.markdown,.srt,.vtt" onChange={(event) => { clearGeneratedDraft(); setCoverage(null); setSelectedFile(event.target.files?.[0] ?? null); setNeedsExtract(Boolean(event.target.files?.[0])); setText(""); setMessage(""); }} disabled={busy} /></label>
        {selectedFile && /\.pdf$/i.test(selectedFile.name) ? <div className="studio-two"><label>Trang bắt đầu<input disabled={busy} type="number" min="1" step="1" value={firstPage} onChange={(event) => { setFirstPage(event.target.value); setNeedsExtract(true); setText(""); setCoverage(null); clearGeneratedDraft(); }} /></label><label>Trang kết thúc (để trống: tối đa {MAX_PDF_PAGES} trang)<input disabled={busy} type="number" min="1" step="1" value={lastPage} onChange={(event) => { setLastPage(event.target.value); setNeedsExtract(true); setText(""); setCoverage(null); clearGeneratedDraft(); }} /></label></div> : null}
        {selectedFile ? <button className="studio-extract" type="button" onClick={() => void extractFile()} disabled={busy}>{busy ? "Đang trích xuất…" : "Trích xuất tệp →"}</button> : null}
        <p className="studio-disclosure">PDF có lớp chữ: tối đa 30 MB, chọn tối đa 60 trang mỗi lượt. PDF scan cần OCR. Tệp văn bản hỗ trợ TXT, Markdown, SRT và VTT.</p></> : null}
        {inputMethod === "link" ? <>
        <label>Liên kết bài viết hoặc nguồn gốc<input disabled={busy} maxLength={2048} type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://..." /></label>
        <button className="studio-extract" type="button" disabled={busy || !sourceUrl.trim()} onClick={() => void importArticleLink()}>{busy ? "Đang đọc nguồn…" : "Đọc bài viết từ liên kết"}</button>
        <p className="studio-disclosure">URL được gửi đến máy chủ ứng dụng để đọc bài công khai, chưa gửi AI. Hỗ trợ một số trang kỹ thuật, Wikipedia, Medium và Distill. Trang yêu cầu đăng nhập hoặc không được hỗ trợ: dùng PDF hoặc dán văn bản.</p>
        </> : <details className="studio-source-metadata"><summary>Thông tin dẫn nguồn (tùy chọn)</summary><label>Tên nguồn<input value={sourceName} onChange={(event) => setSourceName(event.target.value)} maxLength={160} /></label><label>Liên kết nguồn gốc<input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} type="url" maxLength={2048} /></label></details>}
        {coverage ? <div className="studio-message" role="status"><strong>Độ phủ trích xuất</strong><p>Đã xử lý {coverage.processedUnits}/{coverage.selectedUnits} đơn vị nguồn; {coverage.emptyUnits.length} đơn vị không có chữ.</p>{coverage.emptyUnits.length ? <p>Không có chữ tại: {coverage.emptyUnits.join(", ")}.</p> : null}{coverage.truncated ? <p>Nguồn đã bị cắt tại giới hạn ký tự. Đơn vị cuối được xử lý: {coverage.lastProcessedUnit}. Chọn khoảng nhỏ hơn để đọc tiếp.</p> : null}<p>Đây là độ phủ trích xuất, không phải độ phủ khóa học. PDF dùng số trang vật lý.</p></div> : null}
        {inputMethod === "text" || text ? <><label>Nội dung để học<textarea disabled={busy} aria-describedby="studio-source-help" value={text} onChange={(event) => { setText(event.target.value); setNeedsExtract(false); setCoverage(null); clearGeneratedDraft(); }} placeholder={kind === "video" ? "Dán transcript của video vào đây..." : "Dán văn bản từ nguồn vào đây hoặc trích xuất tệp ở trên..."} rows={8} maxLength={MAX_SOURCE_CHARS + 1} /></label><p className="studio-disclosure">Nội dung ở trên là phần sẽ dùng để tạo bản nháp. Đổi cách nhập vẫn giữ phần này cho tới khi ông thay văn bản, chọn tệp mới hoặc xác nhận đọc link mới.</p></> : null}
        <p id="studio-source-help" className="studio-source-help">{needsExtract ? "Trích xuất tệp trước hoặc dán văn bản để tiếp tục." : contentLength < MIN_SOURCE_CHARS ? `Thêm ít nhất ${MIN_SOURCE_CHARS - contentLength} ký tự nội dung để xem bản nháp.` : contentLength > MAX_SOURCE_CHARS ? "Nguồn quá dài. Hãy chia thành các phần nhỏ hơn." : "Đã đủ độ dài. Hãy xem bản nháp để kiểm tra từng đoạn nguồn."}</p>
        <div className="studio-form-foot"><span>{contentLength.toLocaleString("vi-VN")} / {MAX_SOURCE_CHARS.toLocaleString("vi-VN")} ký tự</span><button className="studio-button" aria-describedby="studio-source-help" onClick={create} disabled={busy || needsExtract || contentLength < MIN_SOURCE_CHARS || contentLength > MAX_SOURCE_CHARS}>{busy ? "Đang đọc…" : "Xem bản nháp →"}</button></div>
        <p className="studio-disclosure">Bản nháp chỉ dùng phần nguồn đã nhập. Video cần transcript; kiểm tra dẫn chứng trước khi lưu. Mỗi lượt gửi AI sẽ có bước duyệt riêng.</p>
        {storageError ? <p className="studio-message" role="alert">{storageError}</p> : null}
      </section>
    {draft && step === 3 && reviewKind === "practice" ? <section className="studio-draft" aria-labelledby="studio-draft-title">
      <header><span className="studio-eyebrow">DUYỆT TRƯỚC KHI LƯU · CHƯA LƯU</span><h2 id="studio-draft-title" ref={draftHeading} tabIndex={-1}>Duyệt bản nháp</h2><label>Tên khóa học trong bản nháp<input value={draft.title} maxLength={100} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label><p>{selectedIds.length}/{draft.lessons.length} bài được chọn · {draft.sourceName}</p><p>Đây là các đoạn mẫu từ nguồn, chưa phải khóa học bao phủ toàn bộ tài liệu. Chọn bài hữu ích và viết mục tiêu ông muốn tự giải thích được.</p></header>
      <div className="studio-draft-list">{draft.lessons.map((item, index) => {
        const edit = edits[item.id] ?? { title: item.title, objective: item.objective };
        return <article key={item.id} className={selectedIds.includes(item.id) ? "included" : ""}>
          <label className="studio-draft-select"><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={(event) => setSelectedIds((ids) => event.target.checked ? [...ids, item.id] : ids.filter((id) => id !== item.id))} />Giữ bài {index + 1} · {item.sourceLocation}</label>
          <label>Tên bài {index + 1}<input value={edit.title} maxLength={100} onChange={(event) => setEdits((current) => ({ ...current, [item.id]: { ...edit, title: event.target.value } }))} /></label>
          <label>Mục tiêu bài {index + 1}<textarea rows={2} value={edit.objective} maxLength={300} onChange={(event) => setEdits((current) => ({ ...current, [item.id]: { ...edit, objective: event.target.value } }))} /></label>
          <details><summary>Đối chiếu đoạn nguồn và câu hỏi bài {index + 1}</summary><blockquote>{item.excerpt}</blockquote><strong>{item.question}</strong><ol>{item.options.map((option, optionIndex) => <li key={optionIndex}>{option}{optionIndex === item.answer ? " — Đáp án theo nguồn" : ""}</li>)}</ol><p><strong>Bài ôn sau 72 giờ:</strong> {item.reviewOptions[item.reviewAnswer]}</p><small>Câu hỏi kiểm tra nhận biết ý trong nguồn; mục tiêu tự giải thích do ông đặt chưa được chấm tự động.</small></details>
        </article>;
      })}</div>
      <footer><span>Chọn “Lưu bản nháp trên thiết bị” để khôi phục sau khi tải lại. Thay đổi sau đó cần lưu lại. Thư viện cũ chỉ đổi khi lưu khóa học thành công.</span><button className="studio-extract" onClick={keepDraft}>Lưu bản nháp trên thiết bị</button><button className="studio-extract" onClick={() => setStep(2)}>Quay lại chọn nội dung</button><button className="studio-extract" onClick={() => { try { clearSourcePracticeDraft(window.localStorage); setDraftStorageMessage("Đã xóa bản nháp lưu trên thiết bị."); } catch { setDraftStorageMessage("Không thể xóa bản nháp lưu trên thiết bị."); } }}>Xóa bản nháp đã lưu</button><button className="studio-button" disabled={!hydrated || Boolean(storageError) || selectedIds.length < 2 || !draft.title.trim()} onClick={saveDraft}>Lưu {selectedIds.length} bài vào thư viện →</button></footer>
    </section> : null}
    </div>
    {mode === "create" ? <div hidden={step !== 2}><SourceCoverage value={coverageDraft} onChange={(next) => { setStep(2); setCoverageDraft(next); setDraft(null); setSelectedIds([]); setEdits({}); }} onPractice={(course) => { setStep(3); setReviewKind("practice"); pendingDraftFocus.current = true; setDraft(course); setSelectedIds(course.lessons.map((item) => item.id)); setEdits({}); }} />
      <p>Bài tập nhận biết chạy trên thiết bị dùng 2–6 mục. Khóa AI dùng 1–3 mục, tối đa 12.000 ký tự và cần duyệt trước khi gửi.</p>
      <button className="studio-button" disabled={!coverageDraft || coverageDraft.selectedSectionIds.length < 1 || coverageDraft.selectedSectionIds.length > 3} onClick={() => { setReviewKind("ai"); setStep(3); }}>Tiếp tục tạo bài bằng AI</button>
    </div> : null}
    {mode === "create" ? <div hidden={step !== 3 || reviewKind !== "ai"}><AiCourseStudio active={step === 3 && reviewKind === "ai" && visible} draft={coverageDraft} /></div> : null}
    {mode === "library" && active && lesson ? <section className="studio-reader" aria-labelledby="studio-course-heading">
      <button className="back-link" onClick={() => { setActiveId(null); setChoice(null); setFeedback(null); }}>← Tất cả khóa học</button>
      <div className="studio-reader-head">
        <div><span className="studio-eyebrow">{kindLabels[active.kind]}</span><h2 id="studio-course-heading">{active.title}</h2>
          <p>{completed}/{active.lessons.length} bài đã học · Nguồn: {active.sourceName}</p></div>
        {active.sourceUrl ? <a href={active.sourceUrl} target="_blank" rel="noopener noreferrer">Mở nguồn gốc ↗</a> : null}
      </div>
      <div className="reader-workspace">
        <div className="studio-lesson-tabs" role="group" aria-label="Chọn bài học">
          {active.lessons.map((item, index) => <button key={item.id} className={lessonIndex === index ? "active" : ""} onClick={() => chooseCourse(active, index)} aria-current={lessonIndex === index ? "step" : undefined}>
            <span>Bài {index + 1}</span><strong>{item.title}</strong>
            {item.reviewedAt ? <small>Đã ôn</small> : item.completedAt ? <small>Đã học</small> : null}
          </button>)}
        </div>
        <article className="studio-lesson">
          <div className="studio-lesson-meta"><span>BÀI {lessonIndex + 1} / {active.lessons.length}</span><span>{isReview ? "ÔN ĐẾN HẠN" : lesson.reviewedAt ? "ĐÃ ÔN" : lesson.completedAt ? "ĐÃ HỌC" : "ĐANG HỌC"}</span></div>
          <h3 ref={readerHeading} tabIndex={-1}>{lesson.title}</h3><p>{lesson.objective}</p>
          <blockquote><span>TRÍCH ĐOẠN NGUỒN · {lesson.sourceLocation}</span>{lesson.excerpt}</blockquote>
          <div className="studio-question"><h4>{showReviewQuestion ? "Bài ôn theo nguồn" : "Kiểm tra hiểu"}</h4>
            <p>{showReviewQuestion ? "Trong phần nguồn này, kết luận hoặc hệ quả nào được nêu?" : lesson.question}</p>
            <div className="studio-options">{(showReviewQuestion ? lesson.reviewOptions : lesson.options).map((option, index) =>
              <button key={`${lesson.id}-${index}`} disabled={answerLocked} onClick={() => { setChoice(index); setFeedback(null); }} aria-pressed={choice === index} className={choice === index ? "selected" : ""}>
                <b>{String.fromCharCode(65 + index)}</b>{option}
              </button>)}</div>
            <div className="studio-answer"><button className="studio-button" disabled={choice === null || answerLocked} onClick={submit}>{feedback === "correct" ? "Đã lưu ✓" : isReview ? "Nộp bài ôn" : "Kiểm tra đáp án"}</button>
              {feedback === "retry" ? <p role="status">Chưa khớp đoạn nguồn. Đọc lại phần trích và thử đáp án khác.</p> : feedback === "correct" ? <p role="status">Đúng theo nguồn. {lesson.reviewedAt ? "Đã ghi nhận lần ôn." : "Lịch ôn được mở sau 72 giờ."}</p> : lesson.completedAt && !isReview ? <p>{lesson.reviewedAt ? "Đã hoàn thành lần ôn." : `Ôn sau ${new Date(lesson.reviewDueAt!).toLocaleString("vi-VN")}.`}</p> : null}
            </div>
          </div>
        </article>
      </div>
    </section> : null}
  </div>;
}
