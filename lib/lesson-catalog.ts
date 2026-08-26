import rawCatalog from "../content/courses/raw-data-to-learning-model/catalog.json";
import rawReviews from "../content/courses/raw-data-to-learning-model/reviews.json";
import rawPythonLabs from "../content/courses/raw-data-to-learning-model/python-labs.json";
import type { PythonLabDefinition } from "./python-runner";

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

export type ReviewActivity = {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export const lessonCatalog = rawCatalog as CourseCatalog;
export const reviewCatalog = rawReviews as Record<string, ReviewActivity>;
export const pythonLabCatalog = rawPythonLabs as Record<string, PythonLabDefinition>;

export function getLesson(lessonId: string): LessonContent {
  return lessonCatalog.lessons.find((lesson) => lesson.id === lessonId) ?? lessonCatalog.lessons[0];
}

export function getReview(lessonId: string): ReviewActivity {
  return reviewCatalog[lessonId] ?? reviewCatalog[lessonCatalog.lessons[0].id];
}

export function getPythonLab(lessonId: string): PythonLabDefinition {
  return pythonLabCatalog[lessonId] ?? pythonLabCatalog[lessonCatalog.lessons[0].id];
}
