import rawDiagnostic from "../content/courses/raw-data-to-learning-model/diagnostic.json" with { type: "json" };

export type DiagnosticAxis = "problem_framing" | "data" | "math" | "optimization" | "validation";

export type DiagnosticQuestion = {
  id: string;
  axis: DiagnosticAxis;
  prompt: string;
  options: string[];
  correctIndex: number;
  remediationLessonId: string;
};

export type DiagnosticResult = {
  completedAt: string;
  score: number;
  total: number;
  band: "foundation" | "building" | "ready";
  answers: Record<string, number>;
  axisScores: Record<DiagnosticAxis, { correct: number; total: number }>;
  recommendedLessonId: string;
};

export const diagnosticCatalog = rawDiagnostic as {
  title: string;
  description: string;
  estimatedMinutes: number;
  questions: DiagnosticQuestion[];
};

const axes: DiagnosticAxis[] = ["problem_framing", "data", "math", "optimization", "validation"];

export function scoreDiagnostic(answers: Record<string, number>, completedAt = new Date().toISOString()): DiagnosticResult {
  const axisScores = Object.fromEntries(axes.map((axis) => [axis, { correct: 0, total: 0 }])) as DiagnosticResult["axisScores"];
  let score = 0;
  let recommendedLessonId = "capstone";

  for (const question of diagnosticCatalog.questions) {
    const correct = answers[question.id] === question.correctIndex;
    axisScores[question.axis].total += 1;
    if (correct) {
      score += 1;
      axisScores[question.axis].correct += 1;
    } else if (recommendedLessonId === "capstone") {
      recommendedLessonId = question.remediationLessonId;
    }
  }

  const total = diagnosticCatalog.questions.length;
  return {
    completedAt,
    score,
    total,
    band: score <= 4 ? "foundation" : score <= 7 ? "building" : "ready",
    answers,
    axisScores,
    recommendedLessonId,
  };
}

export function normalizeDiagnostic(value: unknown): DiagnosticResult | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<DiagnosticResult>;
  if (!candidate.answers || typeof candidate.answers !== "object") return null;
  if (typeof candidate.completedAt !== "string") return null;
  if (Object.keys(candidate.answers).length !== diagnosticCatalog.questions.length) return null;
  return scoreDiagnostic(candidate.answers, candidate.completedAt);
}
