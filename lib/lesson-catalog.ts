import rawCatalog from "../content/courses/raw-data-to-learning-model/catalog.json";

export type ChoiceInput = {
  kind: "choice";
  options: string[];
  correctIndex: number;
};

export type NumberInput = {
  kind: "number";
  expected: number;
  tolerance: number;
};

export type TextInput = {
  kind: "text";
  minLength: number;
  rubricTerms: string[];
  requiredTerms: number;
};

export type CodeInput = {
  kind: "code";
  starter: string;
  requiredTokens: string[];
};

export type LessonActivity = {
  id: string;
  label: string;
  eyebrow: string;
  prompt: string;
  evidence: string;
  hints: string[];
  input: ChoiceInput | NumberInput | TextInput | CodeInput;
  success: string;
  retry: string;
};

export type LessonContent = {
  id: string;
  title: string;
  level: string;
  concept: string;
  mechanism: string;
  transfer: string;
  source: { title: string; locator: string };
  activities: LessonActivity[];
};

export type CourseCatalog = {
  course: { id: string; title: string; description: string };
  lessons: LessonContent[];
};

export const lessonCatalog = rawCatalog as CourseCatalog;

export function getLesson(lessonId: string): LessonContent {
  return lessonCatalog.lessons.find((lesson) => lesson.id === lessonId) ?? lessonCatalog.lessons[0];
}
