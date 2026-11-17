export const SOURCE_COURSES_KEY = "briliantai.source-courses.v1";
export const MAX_SOURCE_CHARS = 120_000;

export type SourceKind = "video" | "paper" | "book" | "article";
export type SourceLesson = {
  id: string;
  title: string;
  objective: string;
  excerpt: string;
  sourceLocation: string;
  question: string;
  options: string[];
  answer: number;
  reviewOptions: string[];
  reviewAnswer: number;
  completedAt?: string;
  reviewDueAt?: string;
  reviewedAt?: string;
};
export type SourceCourse = {
  id: string;
  title: string;
  kind: SourceKind;
  sourceName: string;
  sourceUrl?: string;
  createdAt: string;
  lessons: SourceLesson[];
};

const sentences = (text: string) => text.match(/[^.!?。！？\n]+[.!?。！？]?/g)?.map((s) => s.trim()).filter((s) => s.length >= 35 && s.length <= 320) ?? [];

// Transcript fragments are literal bounded spans, not inferred or completed claims.
function transcriptSpans(text: string): string[] {
  const ordinary = sentences(text);
  if (ordinary.length >= 2) return ordinary;
  const spans: string[] = [];
  let remaining = text.trim();
  while (remaining.length > 320) {
    const end = remaining.lastIndexOf(" ", 300);
    if (end < 35) return []; // Do not turn unbroken identifiers/noise into questions.
    spans.push(remaining.slice(0, end));
    remaining = remaining.slice(end).trimStart();
  }
  if (remaining.length >= 35) spans.push(remaining);
  return spans;
}

// Conservative lexical screening for obvious nonlearning book material. This is not
// semantic validation; useful chapter prose still needs the learner's preview.
function bookSentences(text: string): string[] {
  return sentences(text).map((span) => span.replace(/^[\w.]+\([^]*?\)\s+\d+\s+/, "").replace(/^\d+\s+/, "")).filter((span) => {
    const letters = span.match(/\p{L}/gu)?.length ?? 0;
    const digits = span.match(/\d/g)?.length ?? 0;
    // Keywords alone also occur in prose; require a function signature or a whole statement.
    const codeStatement = /\bdef\s+\w+\s*\(/i.test(span)
      || /^(?:from\s+[\w.]+\s+)?import\s+[\w.*]+(?:\s+as\s+\w+)?(?:\s*,\s*[\w.*]+(?:\s+as\s+\w+)?)*\s*$/i.test(span)
      || /^return\s+(?:[\w.]+(?:\([^)]*\)|\[[^\]]*\])?|["'][^]*["']|[\w.]+\s*[-+*/<>]\s*[\w.]+)\s*$/i.test(span);
    return !codeStatement && !/>>>|\.{3,}|[{};=]|^[\w.]+\(|^\d+\s/i.test(span)
      && (span.match(/\w+\([^)]*\)/g)?.length ?? 0) < 3
      && span.length >= 35 && letters >= 25 && digits < letters / 3;
  });
}

function evidenceSpans(text: string, kind: SourceKind): string[] {
  return kind === "video" ? transcriptSpans(text) : kind === "book" ? bookSentences(text) : sentences(text);
}

function bookProse(text: string): string {
  return text.split(/\n\s*\n/).map((block) => {
    if (/^(?:copyright\b|all rights reserved\b|table of contents\b|contents\b|acknowledg(?:e)?ments\b|MEAP\b|early access edition\b)/i.test(block.trim())) return "";
    // A repeated footer is not evidence that the preceding chapter prose is front matter.
    const prose = block.replace(/\bCopyright\s+\d{4}[^.!?\n]{0,180}(?:[.!?]|$)/gi, "")
      .replace(/\bAll rights reserved\.?/gi, "");
    if (/\b(?:MEAP edition|Manning Early Access Program)\b/i.test(prose) || (prose.match(/(?:\.\s*){3,}\d+/g)?.length ?? 0) >= 2 || /(?:no part of this publication may be reproduced|subscribe to livebook|exclusive offers|before publication)/i.test(prose)) return "";
    return prose.split("\n").map((line) => {
      const value = line.trim();
      const proseLine = !/^(?:```|>>>|(?:const|let|var|import|export|function|class)\b|console\.|SELECT\b|def\s|return\s|[{}])/i.test(value)
        && !/\.{3,}\s*\d+\s*$/.test(value)
        && !value.includes("|")
        && !/^[\d\s.,+-]+$/.test(value)
        && !/[{};=]/.test(value);
      // PDF extraction can collapse a whole page onto one line. Keep its useful
      // literal sentences instead of discarding prose beside a code example.
      return proseLine ? line : bookSentences(value).join(" ");
    }).filter(Boolean).join("\n").trim();
  }).filter(Boolean).join("\n\n");
}

type SourceSection = { text: string; location: string; heading?: string };
const sampleSections = (sections: SourceSection[]) => {
  const count = Math.min(6, sections.length);
  return Array.from({ length: count }, (_, i) => sections[Math.round(i * (sections.length - 1) / Math.max(1, count - 1))]);
};

function structuredSections(clean: string, kind: SourceKind): SourceSection[] | null {
  if (kind === "video") {
    const cues = [...clean.matchAll(/^(?:(\d{2}:)?\d{2}:\d{2}[,.]\d{3})\s+-->\s+((?:\d{2}:)?\d{2}:\d{2}[,.]\d{3})[^\n]*\n([\s\S]*?)(?=\n\s*\n|$)/gm)];
    if (cues.length) {
      const sections: SourceSection[] = [];
      let body: string[] = [], start = "", end = "";
      const flush = () => {
        if (body.length) sections.push({ text: body.join(" "), location: `${start}–${end}` });
        body = [];
      };
      for (const cue of cues) {
        const text = cue[3].replace(/<[^>]*>/g, "").replace(/\n/g, " ").trim();
        if (!text) continue;
        if (body.length && body.join(" ").length + text.length > 1800) flush();
        if (!body.length) start = cue[0].split(/\s/)[0].replace(",", ".");
        end = cue[2].replace(",", ".");
        body.push(text);
        if (body.join(" ").length >= 650) flush();
      }
      flush();
      const tail = sections.at(-1);
      const previous = sections.at(-2);
      if (tail && previous && evidenceSpans(tail.text, kind).length < 2 && previous.text.length + tail.text.length + 1 <= 2200) {
        previous.text += ` ${tail.text}`;
        previous.location = previous.location.replace(/–.*$/, `–${end}`);
        sections.pop();
      }
      return sampleSections(sections.filter((section) => evidenceSpans(section.text, kind).length >= 2));
    }
  }
  const headings = [...clean.matchAll(/^#{1,6}\s+(.+)$/gm)];
  if (headings.length >= 2) return sampleSections(headings.map((heading, i) => ({
    heading: heading[1].trim(),
    text: (kind === "book" ? bookProse(clean.slice(heading.index! + heading[0].length, headings[i + 1]?.index ?? clean.length)) : clean.slice(heading.index! + heading[0].length, headings[i + 1]?.index ?? clean.length)).trim().slice(0, 2200),
    location: `Mục: ${heading[1].trim()}`,
  })).filter((section) => evidenceSpans(section.text, kind).length >= 2));
  return null;
}

export function buildSourceCourse(input: { title: string; kind: SourceKind; text: string; sourceName: string; sourceUrl?: string }, now = new Date()): SourceCourse {
  const clean = input.text.replace(/\r/g, "").replace(/[ \t]+/g, " ").trim();
  if (clean.length < 400) throw new Error("Nguồn cần ít nhất 400 ký tự nội dung để tạo bài học có dẫn chứng.");
  if (clean.length > MAX_SOURCE_CHARS) throw new Error("Nguồn quá dài. Hãy chia thành các phần dưới 120.000 ký tự.");
  const pageBlocks = clean.split(/(?=^Trang \d+\n)/m).map((block) => block.trim()).filter((block) => /^Trang \d+\n/.test(block));
  let sections: SourceSection[];
  const structured = structuredSections(clean, input.kind);
  if (structured) {
    sections = structured;
  } else if (pageBlocks.length >= 2) {
    const pages = pageBlocks.map((block) => {
      const [, number, body] = block.match(/^Trang (\d+)\n([\s\S]*)$/) ?? [];
      return { number, body: input.kind === "book" ? bookProse(body ?? "") : body?.trim() ?? "" };
    });
    // For books, skip cover, acknowledgments and contents only when a real chapter starts a page.
    const chapter = input.kind === "book" ? pages.findIndex((page) => /^(?:Chapter|Chương)\s+\d+\b/i.test(page.body)) : -1;
    const prosePages = (chapter > 0 ? pages.slice(chapter) : pages)
      .filter((page) => evidenceSpans(page.body.slice(0, 2200), input.kind).length >= 2);
    const count = Math.min(6, prosePages.length);
    sections = Array.from({ length: count }, (_, index) => {
      const page = prosePages[Math.round(index * (prosePages.length - 1) / Math.max(1, count - 1))];
      return { text: page.body.slice(0, 2200), location: `Trang ${page.number}` };
    });
  } else {
    const prose = input.kind === "book" ? bookProse(clean) : clean;
    const blocks = prose.split(/\n\s*\n/).map((s) => s.trim()).filter((s) => s.length > 35);
    const candidates = blocks.length >= 2 ? blocks : prose.match(/[\s\S]{1,1100}(?:\s|$)/g)?.map((s) => s.trim()) ?? [];
    if (candidates.length < 2) throw new Error(input.kind === "book" ? "Hãy chọn ít nhất hai đoạn văn xuôi trong nội dung chương, bỏ trang bản quyền, mục lục và mã/bảng." : "Nguồn cần ít nhất hai đoạn văn xuôi rõ ràng để chia thành bài học.");
    sections = sampleSections(candidates.map((text, index) => ({ text: text.slice(0, 2200), location: `Đoạn ${index + 1}` }))
      .filter((section) => evidenceSpans(section.text, input.kind).length >= 2));
  }
  if (sections.length < 2) throw new Error(input.kind === "book" ? "Không đủ đoạn văn xuôi trong nội dung chương. Hãy bỏ trang bản quyền, mục lục và mã/bảng, rồi chọn ít nhất hai đoạn có nội dung." : input.kind === "video" ? "Không đủ lời nói rõ ràng trong transcript. Hãy cung cấp SRT/VTT có lời nói hoặc ít nhất hai đoạn transcript." : "Không đủ nội dung rõ ràng để tạo khóa học.");
  const evidence = (section: SourceSection) => evidenceSpans(section.text, input.kind);
  const claims = sections.map((section) => evidence(section)[0]);
  const transferClaims = sections.map((section) => evidence(section)[1]);
  if (new Set(claims.map((claim) => claim.toLocaleLowerCase())).size !== sections.length || new Set(transferClaims.map((claim) => claim.toLocaleLowerCase())).size !== sections.length) throw new Error("Nguồn có quá nhiều đoạn lặp để tạo câu hỏi phân biệt. Hãy chọn các phần đa dạng hơn.");
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `course-${now.getTime()}-${Math.random().toString(36).slice(2, 9)}`;
  return {
    id,
    title: input.title.trim().slice(0, 100) || input.sourceName.trim().slice(0, 100) || "Khóa học từ nguồn",
    kind: input.kind,
    sourceName: input.sourceName.trim().slice(0, 160),
    sourceUrl: input.sourceUrl?.trim() || undefined,
    createdAt: now.toISOString(),
    lessons: sections.map((section, index) => {
      const claim = claims[index];
      const normalizedExcerpt = section.text.toLocaleLowerCase().replace(/\s+/g, " ");
      const absent = (claim: string) => !normalizedExcerpt.includes(claim.toLocaleLowerCase().replace(/\s+/g, " "));
      const distractors = claims.filter((claim, i) => i !== index && absent(claim)).slice(0, 2);
      const reviewDistractors = transferClaims.filter((claim, i) => i !== index && absent(claim)).slice(0, 2);
      const count = Math.min(distractors.length, reviewDistractors.length);
      if (!count) throw new Error("Các đoạn nguồn chồng lặp đáp án. Hãy chọn nội dung phân biệt rõ hơn.");
      const options = [claim, ...distractors.slice(0, count)];
      // Rotating the position avoids a fixed first-option answer.
      const answer = index % options.length;
      options.splice(0, 1);
      options.splice(answer, 0, claim);
      const transfer = transferClaims[index];
      const reviewOptions = [transfer, ...reviewDistractors.slice(0, count)];
      const reviewAnswer = (index + 1) % reviewOptions.length;
      reviewOptions.splice(0, 1);
      reviewOptions.splice(reviewAnswer, 0, transfer);
      const heading = section.heading ?? claim;
      const shortTitle = heading.length <= 75 ? heading : (heading.split(/[.!?]/)[0] ?? heading).slice(0, 70).replace(/\s+\S*$/, "") + "…";
      return {
        id: `lesson-${index + 1}`,
        title: shortTitle.length >= 8 ? shortTitle.replace(/^#+\s*/, "") : `Ý chính ${index + 1}`,
        objective: `Xác định và giải thích ý chính trong ${section.location} của nguồn.`,
        excerpt: section.text.slice(0, 2200),
        sourceLocation: `${section.location} · ${input.sourceName.trim().slice(0, 100)}`,
        question: "Nhận định nào xuất hiện trong phần nguồn vừa đọc?",
        options,
        answer,
        reviewOptions,
        reviewAnswer,
      };
    }),
  };
}

export type SourceCoursesReadResult = { courses: SourceCourse[]; error: null } | { courses: null; error: string };

export function readSourceCourses(getStorage: () => Pick<Storage, "getItem">): SourceCoursesReadResult {
  try {
    return { courses: parseSourceCourses(getStorage().getItem(SOURCE_COURSES_KEY) ?? "[]"), error: null };
  } catch {
    return { courses: null, error: "Không đọc được các khóa học trên thiết bị. Hãy thử đọc lại hoặc mở Thư viện để kiểm tra. Dữ liệu đã lưu chưa bị thay đổi." };
  }
}

export function finalizeSourceDraft(draft: SourceCourse, selectedIds: string[], edits: Record<string, { title: string; objective: string }> = {}): SourceCourse {
  const selected = new Set(selectedIds);
  if (selected.size < 2) throw new Error("Chọn ít nhất 2 bài để tạo lộ trình.");
  if (selectedIds.some((id) => !draft.lessons.some((lesson) => lesson.id === id))) throw new Error("Bài được chọn không tồn tại trong bản nháp.");
  const lessons = draft.lessons.filter((lesson) => selected.has(lesson.id)).map((lesson) => {
    const edit = edits[lesson.id];
    const title = (edit?.title ?? lesson.title).trim();
    const objective = (edit?.objective ?? lesson.objective).trim();
    if (!title || title.length > 100 || !objective || objective.length > 300) throw new Error("Mỗi bài cần tên bài (tối đa 100 ký tự) và mục tiêu (tối đa 300 ký tự).");
    if (!lesson.excerpt.includes(lesson.options[lesson.answer]) || !lesson.excerpt.includes(lesson.reviewOptions[lesson.reviewAnswer])) throw new Error("Đáp án thiếu dẫn chứng trong đoạn nguồn. Hãy tạo lại bản nháp từ nguồn rõ hơn.");
    return { ...lesson, title, objective };
  });
  const course = { ...draft, lessons };
  parseSourceCourses(JSON.stringify([course]));
  return course;
}

const SOURCE_REVIEW_DELAY_MS = 72 * 60 * 60 * 1000;
const validDate = (value: unknown): value is string => typeof value === "string" && Number.isFinite(Date.parse(value));
const nonemptyText = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

function validateSourceCourse(item: unknown): asserts item is SourceCourse {
    if (!item || typeof item !== "object") throw new Error("Khóa học nguồn không hợp lệ.");
    const course = item as SourceCourse;
    if (!nonemptyText(course.id) || course.id.length > 100 || typeof course.title !== "string" || course.title.length > 100 || !validDate(course.createdAt) || !["video", "paper", "book", "article"].includes(course.kind) || typeof course.sourceName !== "string" || course.sourceName.length > 160 || !Array.isArray(course.lessons) || course.lessons.length < 2 || course.lessons.length > 6 || (course.sourceUrl !== undefined && !/^https?:\/\/\S+$/i.test(course.sourceUrl))) throw new Error("Khóa học nguồn không hợp lệ.");
    const lessonIds = new Set<string>();
    for (const lesson of course.lessons) {
      if (!lesson || !nonemptyText(lesson.id) || lessonIds.has(lesson.id) || typeof lesson.title !== "string" || !nonemptyText(lesson.objective) || lesson.objective.length > 300 || !nonemptyText(lesson.sourceLocation) || typeof lesson.excerpt !== "string" || lesson.excerpt.length > 2200 || !Array.isArray(lesson.options) || lesson.options.length < 2 || lesson.options.length > 3 || lesson.options.some((option) => typeof option !== "string" || option.length > 320) || !Number.isInteger(lesson.answer) || lesson.answer < 0 || lesson.answer >= lesson.options.length || !Array.isArray(lesson.reviewOptions) || lesson.reviewOptions.length !== lesson.options.length || lesson.reviewOptions.some((option) => typeof option !== "string" || option.length > 320) || !Number.isInteger(lesson.reviewAnswer) || lesson.reviewAnswer < 0 || lesson.reviewAnswer >= lesson.reviewOptions.length) throw new Error("Bài học nguồn không hợp lệ.");
      const normalize = (text: string) => text.trim().toLocaleLowerCase().replace(/\s+/g, " ");
      const excerpt = normalize(lesson.excerpt);
      for (const [options, answer] of [[lesson.options, lesson.answer], [lesson.reviewOptions, lesson.reviewAnswer]] as const) {
        if (options.some((option) => !option.trim()) || new Set(options.map(normalize)).size !== options.length) throw new Error("Đáp án bài học nguồn không hợp lệ: lựa chọn trống hoặc trùng nhau.");
        if (!excerpt.includes(normalize(options[answer]))) throw new Error("Đáp án bài học nguồn không hợp lệ: thiếu dẫn chứng trong đoạn nguồn.");
        if (options.some((option, index) => index !== answer && excerpt.includes(normalize(option)))) throw new Error("Đáp án bài học nguồn không hợp lệ: lựa chọn chồng lặp dẫn chứng.");
      }
      lessonIds.add(lesson.id);
      if (lesson.completedAt !== undefined || lesson.reviewDueAt !== undefined || lesson.reviewedAt !== undefined) {
        if (!validDate(lesson.completedAt) || !validDate(lesson.reviewDueAt) || Date.parse(lesson.reviewDueAt) < Date.parse(lesson.completedAt) + SOURCE_REVIEW_DELAY_MS || (lesson.reviewedAt !== undefined && (!validDate(lesson.reviewedAt) || Date.parse(lesson.reviewedAt) < Date.parse(lesson.reviewDueAt)))) throw new Error("Thời điểm học và ôn bài không hợp lệ.");
      }
    }
}

export function parseSourceCourses(text: string): SourceCourse[] {
  const value: unknown = JSON.parse(text);
  if (!Array.isArray(value) || value.length > 20) throw new Error("Thư viện nguồn không hợp lệ.");
  const courseIds = new Set<string>();
  for (const item of value) {
    validateSourceCourse(item);
    if (courseIds.has(item.id)) throw new Error("Mã khóa học nguồn không hợp lệ: bị trùng.");
    courseIds.add(item.id);
  }
  return value as SourceCourse[];
}

export function completeSourceLesson(course: SourceCourse, lessonId: string, now = new Date(), review = false): SourceCourse {
  validateSourceCourse(course);
  if (!Number.isFinite(now.getTime())) throw new Error("Thời điểm học không hợp lệ.");
  const selected = course.lessons.find((lesson) => lesson.id === lessonId);
  if (!selected) throw new Error("Bài học không tồn tại.");
  if (review && (!selected.reviewDueAt || Date.parse(selected.reviewDueAt) > now.getTime())) throw new Error("Bài ôn chưa đến hạn.");
  // Replaying an activity must not move its review deadline or overwrite earned evidence.
  if (review ? selected.reviewedAt : selected.completedAt) return course;
  return { ...course, lessons: course.lessons.map((lesson) => {
    if (lesson.id !== lessonId) return lesson;
    return review ? { ...lesson, reviewedAt: now.toISOString() } : { ...lesson, completedAt: now.toISOString(), reviewDueAt: new Date(now.getTime() + SOURCE_REVIEW_DELAY_MS).toISOString() };
  }) };
}
