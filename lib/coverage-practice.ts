import { buildPracticeFromSections, parseSourceCourses, type SourceCourse } from "./source-course.ts";
import { formatLocator, validateEvidence } from "./source-document.ts";
import type { CoverageDraft } from "./source-draft-store.ts";

/** Creates recognition exercises for exactly the chosen source sections, never a sampled full-document course. */
export function toPracticeCourse(draft: CoverageDraft): SourceCourse {
  const ids = draft.selectedSectionIds;
  if (!Array.isArray(ids) || ids.length < 2 || ids.length > 6) throw new Error("Chọn từ 2 đến 6 mục để tạo bài tập; các mục còn lại vẫn nằm trong bản nháp độ phủ.");
  const selected = new Set(ids);
  if (selected.size !== ids.length) throw new Error("Mục được chọn bị trùng.");
  const sections = draft.document.sections.filter((section) => selected.has(section.id));
  if (sections.length !== ids.length || new Set(sections.map((section) => section.id)).size !== sections.length) throw new Error("Mục được chọn không còn tồn tại trong nguồn.");
  if (!Number.isFinite(Date.parse(draft.updatedAt))) throw new Error("Thời điểm bản nháp không hợp lệ.");
  const course = buildPracticeFromSections({
    title: draft.title, kind: draft.kind, sourceName: draft.document.name, sourceUrl: draft.sourceUrl,
  }, sections.map((section) => ({
    // v1 course excerpts are bounded at 2,200 characters. Coverage retains the complete section.
    text: section.text.slice(0, 2200),
    location: formatLocator(section.locator),
  })), new Date(draft.updatedAt));
  course.lessons = course.lessons.map((lesson, index) => {
    const section = sections[index];
    if (!validateEvidence(draft.document, { sectionId: section.id, quote: lesson.excerpt })
      || !lesson.excerpt.includes(lesson.options[lesson.answer])
      || !lesson.excerpt.includes(lesson.reviewOptions[lesson.reviewAnswer])) {
      throw new Error("Đáp án thiếu dẫn chứng nguyên văn. Hãy chọn các mục văn xuôi rõ ràng hơn.");
    }
    return { ...lesson, id: section.id };
  });
  parseSourceCourses(JSON.stringify([course]));
  return course;
}
