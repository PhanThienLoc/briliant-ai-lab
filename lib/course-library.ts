import type { SourceCourse, SourceKind } from "./source-course";

const searchable = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLocaleLowerCase().trim();

export function filterSourceCourses(courses: SourceCourse[], query: string, kind: SourceKind | "all"): SourceCourse[] {
  const term = searchable(query);
  return courses.filter((course) => (kind === "all" || course.kind === kind) && searchable(`${course.title} ${course.sourceName}`).includes(term));
}

export function sourceCourseProgress(course: SourceCourse): { completed: number; total: number; percent: number } {
  const total = course.lessons.length;
  const completed = course.lessons.filter((lesson) => Boolean(lesson.completedAt)).length;
  return { completed, total, percent: total ? Math.round(completed / total * 100) : 0 };
}
