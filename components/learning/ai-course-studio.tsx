"use client";

import { useEffect, useRef, useState } from "react";
import { useAiSettings } from "./ai-context";
import { generateTeachingText, type AiConfig } from "../../lib/ai-provider";
import { buildTeachingPrompt, parseTeachingOutput, buildTutorPrompt, parseTutorOutput, readTeachingCourses, saveTeachingCourse, deleteTeachingCourse, type TeachingCourse } from "../../lib/ai-course";
import { readTeachingProgress, recordTeachingCheck, teachingReviewDue, type TeachingProgress } from "../../lib/teaching-progress";
import type { CoverageDraft } from "../../lib/source-draft-store";
import { formatLocator } from "../../lib/source-document";
import "../../app/ai-course-studio.css";

type SendPreview = { config: AiConfig; prompt: string; document: CoverageDraft["document"]; selectedIds: string[] };
const destination = (provider: string) => provider === "gemini" ? "Google Gemini API" : "OpenRouter và nhà cung cấp model được định tuyến miễn phí";

export function AiCourseStudio({ draft, active = true }: { draft: CoverageDraft | null; active?: boolean }) {
  const { config } = useAiSettings();
  const [preview, setPreview] = useState<SendPreview | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [candidate, setCandidate] = useState<TeachingCourse | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [savedCourses, setSavedCourses] = useState<TeachingCourse[]>([]);
  const [studyCourse, setStudyCourse] = useState<TeachingCourse | null>(null);
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);

  useEffect(() => {
    if (active) return;
    generation.current++; request.current?.abort();
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) { setPreview(null); setConsent(false); setBusy(false); } });
    return () => { cancelled = true; };
  }, [active]);

  // A changed source/model/key invalidates the reviewed payload and any in-flight result.
  useEffect(() => {
    const activeGeneration = generation;
    activeGeneration.current++;
    request.current?.abort();
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setPreview(null); setConsent(false); setBusy(false);
      setCandidate(null); setReviewed(false);
    });
    return () => { cancelled = true; activeGeneration.current++; request.current?.abort(); };
  }, [config, draft]);

  function prepare() {
    try {
      if (!draft) throw new Error("Tạo hoặc mở bản nháp độ phủ rồi chọn 1–3 mục để thử tạo bài bằng AI.");
      if (!config.apiKey.trim()) throw new Error("Nhập API key trong Cài đặt AI trước. Key chỉ được giữ trong tab hiện tại.");
      if (config.provider === "gemini" && !config.geminiFreeTier) throw new Error("Chỉ dùng Gemini khi dự án API đang ở Free Tier và chưa bật billing. Xác nhận trong Cài đặt AI.");
      const prompt = buildTeachingPrompt(draft.document, draft.selectedSectionIds);
      setPreview({ config: { ...config }, prompt, document: structuredClone(draft.document), selectedIds: [...draft.selectedSectionIds] });
      setConsent(false); setCandidate(null); setReviewed(false); setMessage("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Chưa thể chuẩn bị yêu cầu."); }
  }

  async function send() {
    if (!active || !preview || !consent || busy) return;
    const snapshot = preview;
    if (!draft || snapshot.config.apiKey !== config.apiKey || snapshot.config.provider !== config.provider || snapshot.config.model !== config.model || snapshot.config.geminiFreeTier !== config.geminiFreeTier || JSON.stringify(snapshot.document) !== JSON.stringify(draft.document) || JSON.stringify(snapshot.selectedIds) !== JSON.stringify(draft.selectedSectionIds)) {
      setPreview(null); setConsent(false); setMessage("Nguồn hoặc cấu hình đã đổi. Hãy xem lại nội dung sẽ gửi."); return;
    }
    const token = ++generation.current;
    const controller = new AbortController(); request.current = controller;
    setBusy(true); setCandidate(null); setReviewed(false); setMessage("Đang tạo bản thử nghiệm. Một yêu cầu duy nhất; không tự thử lại hoặc chuyển model trả phí.");
    try {
      const raw = await generateTeachingText(snapshot.config, snapshot.prompt, controller.signal);
      if (controller.signal.aborted || token !== generation.current) return;
      const course = parseTeachingOutput(raw, snapshot.document, snapshot.selectedIds, snapshot.config.provider, snapshot.config.model);
      setCandidate(course);
      setMessage("AI đã trả về bản nháp có dẫn chứng khớp nguồn. Hãy đọc và đối chiếu: kiểm tra cấu trúc/dẫn chứng không chứng minh mọi giải thích đều đúng.");
    } catch (error) {
      if (token !== generation.current) return;
      setMessage(controller.signal.aborted ? "Đã hủy chờ kết quả. Nhà cung cấp có thể đã nhận yêu cầu; không tự gửi lại." : error instanceof Error ? error.message : "Chưa nhận được bài hợp lệ. Không tự thử lại.");
    } finally {
      if (token === generation.current) { setBusy(false); setConsent(false); setPreview(null); request.current = null; }
    }
  }

  function loadSaved() {
    const result = readTeachingCourses(() => window.localStorage);
    setSavedCourses(result.courses ?? []);
    setMessage(result.error || (result.courses?.length ? "Chọn khóa AI đã lưu để học." : "Chưa có khóa AI đã duyệt trên thiết bị này."));
  }

  function removeCourse(course: TeachingCourse) {
    if (!window.confirm(`Xóa khóa AI “${course.title}” khỏi thiết bị? Hãy sao lưu Passport trước nếu muốn giữ lại.`)) return;
    try {
      deleteTeachingCourse(window.localStorage, course.id);
      if (studyCourse?.id === course.id) setStudyCourse(null);
      loadSaved();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không xóa được khóa AI."); }
  }

  function save() {
    if (!candidate || !reviewed) return;
    try {
      saveTeachingCourse(window.localStorage, candidate);
      setStudyCourse(candidate); setCandidate(null); setReviewed(false);
      setMessage("Đã lưu khóa AI đã duyệt trên thiết bị. Bằng chứng học sẽ ghi riêng khi kiểm tra bài.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Chưa thể lưu. Bản nháp vẫn còn trên màn hình."); }
  }

  return <section className="ai-course-studio" aria-labelledby="ai-studio-heading">
    <header><div><span className="studio-eyebrow">THỬ NGHIỆM · KHÓA HỌC CÓ DẪN CHỨNG</span><h2 id="ai-studio-heading">Tạo bài học bằng AI</h2></div><button className="studio-extract" onClick={loadSaved}>Mở khóa AI đã lưu</button></header>
    <p>Chọn 1–3 mục trong bản đồ độ phủ, tối đa 12.000 ký tự. AI tạo bài tiếng Việt để ông duyệt trước khi lưu; không tự phát hành hoặc tự xác nhận đã hiểu.</p>
    <p><strong>{destination(config.provider)}</strong> · {config.model} · {config.apiKey ? "Đã nhập key trong tab" : "Chưa nhập key — mở Cài đặt AI"}</p>
    <button className="studio-button" disabled={busy || !draft} onClick={prepare}>Xem nội dung sẽ gửi đến AI</button>
    {message ? <p className="studio-message" role="status">{message}</p> : null}
    {preview ? <section className="ai-send-preview" aria-label="Nội dung yêu cầu trước khi gửi">
      <h3>Kiểm tra trước khi gửi</h3><p>Đích: {destination(preview.config.provider)} · Model: {preview.config.model}.</p>
      <p>Yêu cầu dưới đây chứa toàn bộ hướng dẫn và trích đoạn sẽ gửi. API key đi kèm để xác thực qua máy chủ ứng dụng nhưng không được lưu vào khóa học hoặc backup. Không gửi toàn bộ tệp gốc, lịch sử học hay khóa học khác.</p>
      <pre tabIndex={0} aria-label="Toàn bộ nội dung gửi AI">{preview.prompt}</pre>
      <label className="ai-confirm"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} disabled={busy} />Tôi đã xem nội dung trên và đồng ý gửi lần này đến {destination(preview.config.provider)}.</label>
      <button className="studio-button" disabled={!consent || busy} onClick={() => void send()}>{busy ? "Đang tạo…" : "Gửi một yêu cầu tạo bài"}</button>
    </section> : null}
    {busy ? <button className="studio-extract" onClick={() => request.current?.abort()}>Hủy chờ kết quả</button> : null}
    {candidate ? <section aria-label="Bản nháp AI chưa duyệt"><h3>Bản nháp AI · Chưa duyệt</h3><p>Đọc tất cả giải thích, câu hỏi và đáp án; đối chiếu dẫn chứng. Mã Python chỉ là văn bản, không tự chạy.</p><TeachingReader key={candidate.id} course={candidate} saved={false} /><label className="ai-confirm"><input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} />Tôi đã kiểm tra nội dung và muốn lưu bản này để học.</label><button className="studio-button" disabled={!reviewed} onClick={save}>Lưu khóa AI đã duyệt</button></section> : null}
    {savedCourses.length ? <ul className="ai-saved-list">{savedCourses.map((course) => <li key={course.id}><button className="studio-extract" onClick={() => setStudyCourse(course)}>{course.title} · {course.lessons.length} bài</button><button className="studio-extract" aria-label={`Xóa khóa AI ${course.title}`} onClick={() => removeCourse(course)}>Xóa</button></li>)}</ul> : null}
    {studyCourse ? <TeachingReader key={studyCourse.id} course={studyCourse} saved active={active} /> : null}
    <p className="studio-disclosure">Bản đầu dùng sơ đồ theo từng bước và bài code dạng văn bản. Mỗi lượt hỏi gia sư cần duyệt riêng nội dung gửi. Thực thi bài code do AI tạo chưa được bật.</p>
  </section>;
}

function TeachingReader({ course, saved, active = true }: { course: TeachingCourse; saved: boolean; active?: boolean }) {
  const [index, setIndex] = useState(0);
  const [prediction, setPrediction] = useState("");
  const [reveal, setReveal] = useState(!saved);
  const [choice, setChoice] = useState<number | null>(null);
  const [transferChoice, setTransferChoice] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [progress, setProgress] = useState<TeachingProgress>({});
  const [now, setNow] = useState(0);
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const result = readTeachingProgress(() => window.localStorage);
      setProgress(result.progress ?? {}); if (result.error) setFeedback(result.error);
      setNow(Date.now());
    });
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);
  const lesson = course.lessons[index];
  const lessonKey = `${course.id}:${lesson.id}`;
  const due = teachingReviewDue(progress, lessonKey, now);
  const completed = progress[lessonKey];
  const check = lesson.check;
  function openLesson(next: number) { setIndex(next); setPrediction(""); setReveal(!saved); setChoice(null); setTransferChoice(null); setFeedback(""); }
  function mark(review: boolean) {
    const item = review ? lesson.transfer : check;
    const answer = review ? transferChoice : choice;
    if (answer === null) return;
    setFeedback(item.feedback[answer]);
    if (answer !== item.answer || !saved) return;
    try { const next = recordTeachingCheck(window.localStorage, lessonKey, review, new Date()); setProgress(next); setNow(Date.now()); }
    catch (error) { setFeedback(error instanceof Error ? error.message : "Không thể lưu kết quả; dữ liệu cũ chưa đổi."); }
  }
  return <article className="ai-teaching-reader" aria-label={saved ? `Khóa AI: ${course.title}` : `Xem trước: ${course.title}`}>
    <h3>{course.title}</h3><nav aria-label="Chọn bài trong khóa AI">{course.lessons.map((item, i) => <button key={item.id} className="studio-extract" aria-current={i === index ? "step" : undefined} onClick={() => openLesson(i)}>{i + 1}. {item.title}</button>)}</nav>
    <h4>{lesson.title}</h4><p><strong>Mục tiêu:</strong> {lesson.objective}</p>
    <section><h5>Tình huống</h5><p>{lesson.scenario}</p></section>
    <section><h5>Dự đoán trước khi đọc lời giải</h5><p>{lesson.prediction}</p>{saved ? <><label>Viết dự đoán của ông<textarea value={prediction} onChange={(event) => setPrediction(event.target.value)} rows={3} maxLength={2000} /></label><button className="studio-extract" disabled={!prediction.trim()} onClick={() => setReveal(true)}>Đối chiếu với giải thích</button></> : null}</section>
    {reveal ? <>
      <section><h5>Giải thích cơ chế</h5><p>{lesson.explanation}</p><h5>Ví dụ đã giải</h5><p>{lesson.workedExample}</p></section>
      <section><h5>Sơ đồ từng bước</h5><ol className="ai-visual-steps">{lesson.visualSteps.map((step, i) => <li key={i}><b>{String(i + 1).padStart(2, "0")}</b><span>{step}</span></li>)}</ol></section>
      <section><h5>Bài tập Python</h5><p>{lesson.pythonExercise.prompt}</p><pre tabIndex={0} aria-label="Mã Python khởi đầu">{lesson.pythonExercise.starter}</pre><p className="studio-disclosure">Không tự chạy mã do AI tạo. Thử trong môi trường Python riêng sau khi kiểm tra mã.</p><details><summary>Xem lời giải Python để đối chiếu</summary><pre tabIndex={0}>{lesson.pythonExercise.solution}</pre></details></section>
      <section><h5>Kiểm tra ban đầu</h5><p>{check.question}</p><div className="ai-choices">{check.options.map((option, i) => <button key={i} aria-pressed={choice === i} onClick={() => setChoice(i)}>{String.fromCharCode(65 + i)}. {option}</button>)}</div><button className="studio-button" disabled={choice === null} onClick={() => mark(false)}>{saved ? "Kiểm tra và ghi nhận" : "Xem phản hồi"}</button>{!saved ? <details><summary>Đáp án để duyệt</summary><p>{String.fromCharCode(65 + check.answer)} · {check.feedback[check.answer]}</p></details> : null}</section>
      <section><h5>Bài transfer sau 72 giờ</h5>{!saved ? <><p>{lesson.transfer.question}</p><ol>{lesson.transfer.options.map((option, i) => <li key={i}>{option}{i === lesson.transfer.answer ? " — Đáp án" : ""}</li>)}</ol><p>{lesson.transfer.feedback[lesson.transfer.answer]}</p></> : due ? <><p>{lesson.transfer.question}</p><div className="ai-choices">{lesson.transfer.options.map((option, i) => <button key={i} aria-pressed={transferChoice === i} onClick={() => setTransferChoice(i)}>{String.fromCharCode(65 + i)}. {option}</button>)}</div><button className="studio-button" disabled={transferChoice === null} onClick={() => mark(true)}>Nộp bài transfer</button></> : <p>{completed?.reviewedAt ? "Đã ghi nhận lần ôn theo đáp án đã duyệt." : completed?.completedAt ? `Mở từ ${new Date(Date.parse(completed.completedAt) + 72 * 3_600_000).toLocaleString("vi-VN")}.` : "Hoàn thành kiểm tra ban đầu để đặt mốc ôn sau 72 giờ."}</p>}</section>
      {feedback ? <p role="status" className="studio-message">{feedback}</p> : null}
    </> : null}
    {saved ? <TutorFollowup key={lesson.id} course={course} active={active} /> : null}
    <section><h5>Đối chiếu nguồn</h5>{lesson.evidence.map((ref, i) => { const section = course.source.document.sections.find((item) => item.id === ref.sectionId); return <blockquote key={i}><small>{section ? formatLocator(section.locator) : ref.sectionId}</small><p>{ref.quote}</p></blockquote>; })}<p className="studio-disclosure">Dẫn chứng khớp văn bản không đảm bảo AI đã diễn giải đúng. Kết quả trắc nghiệm này chưa phải xác nhận Mastered.</p></section>
  </article>;
}

function TutorFollowup({ course, active }: { course: TeachingCourse; active: boolean }) {
  const { config } = useAiSettings();
  const [question, setQuestion] = useState("");
  const [preview, setPreview] = useState<{ prompt: string; config: AiConfig } | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [answer, setAnswer] = useState<ReturnType<typeof parseTutorOutput> | null>(null);
  const request = useRef<AbortController | null>(null);
  const token = useRef(0);
  useEffect(() => {
    const activeToken = token;
    activeToken.current++; request.current?.abort();
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setPreview(null); setConsent(false); setBusy(false); setAnswer(null);
    });
    return () => { cancelled = true; activeToken.current++; request.current?.abort(); };
  }, [config, course, active]);
  function prepare() {
    try {
      if (!config.apiKey.trim()) throw new Error("Nhập API key trong Cài đặt AI trước.");
      if (config.provider === "gemini" && !config.geminiFreeTier) throw new Error("Chỉ dùng dự án Gemini Free Tier chưa bật billing.");
      const prompt = buildTutorPrompt(course.source.document, course.source.selectedSectionIds, question);
      setPreview({ prompt, config: { ...config } }); setConsent(false); setAnswer(null); setMessage("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Chưa thể chuẩn bị câu hỏi."); }
  }
  async function send() {
    if (!active || !preview || !consent || busy) return;
    const snapshot = preview;
    if (snapshot.config.apiKey !== config.apiKey || snapshot.config.provider !== config.provider || snapshot.config.model !== config.model || snapshot.config.geminiFreeTier !== config.geminiFreeTier) { setPreview(null); setConsent(false); setMessage("Cấu hình đã đổi. Hãy duyệt lại yêu cầu."); return; }
    const current = ++token.current;
    const controller = new AbortController(); request.current = controller;
    setBusy(true); setMessage("Đang hỏi gia sư theo đúng phần nguồn đã chọn…");
    try {
      const raw = await generateTeachingText(snapshot.config, snapshot.prompt, controller.signal);
      if (current !== token.current || controller.signal.aborted) return;
      setAnswer(parseTutorOutput(raw, course.source.document, course.source.selectedSectionIds));
      setMessage("Phản hồi thử nghiệm. Hãy đối chiếu câu trả lời với trích đoạn gốc; dẫn chứng khớp chữ không đảm bảo diễn giải đúng.");
    } catch (error) {
      if (current === token.current) setMessage(controller.signal.aborted ? "Đã hủy chờ. Không tự gửi lại." : error instanceof Error ? error.message : "Chưa nhận được phản hồi hợp lệ.");
    } finally {
      if (current === token.current) { setBusy(false); setPreview(null); setConsent(false); request.current = null; }
    }
  }
  return <section className="ai-tutor" aria-label="Gia sư theo nguồn"><h5>Hỏi gia sư về phần nguồn này</h5><label>Câu hỏi của ông<textarea maxLength={1000} rows={3} value={question} disabled={busy} onChange={(event) => { setQuestion(event.target.value); setPreview(null); setConsent(false); }} /></label><p>Chỉ gửi câu hỏi hiện tại và các mục nguồn đã chọn. Không gửi lịch sử trò chuyện hoặc kết quả học.</p><button className="studio-extract" onClick={prepare} disabled={busy || !question.trim()}>Xem yêu cầu hỏi gia sư</button>
    {preview ? <div className="ai-send-preview"><p>Đích: {destination(preview.config.provider)} · {preview.config.model}</p><pre tabIndex={0} aria-label="Nội dung gửi gia sư">{preview.prompt}</pre><label className="ai-confirm"><input type="checkbox" checked={consent} disabled={busy} onChange={(event) => setConsent(event.target.checked)} />Tôi đồng ý gửi câu hỏi và nguồn trên lần này.</label><button className="studio-button" disabled={!consent || busy} onClick={() => void send()}>Gửi một câu hỏi</button></div> : null}
    {busy ? <button className="studio-extract" onClick={() => request.current?.abort()}>Hủy chờ gia sư</button> : null}
    {message ? <p role="status">{message}</p> : null}
    {answer ? <article><p>{answer.answer}</p>{answer.evidence.map((ref, i) => { const section = course.source.document.sections.find((item) => item.id === ref.sectionId); return <blockquote key={i}><small>{section ? formatLocator(section.locator) : ref.sectionId}</small><p>{ref.quote}</p></blockquote>; })}</article> : null}
  </section>;
}
