import type { TextInput } from "./lesson-catalog";
export type ExplanationDiagnosis = "copied_hint" | "keyword_dump" | "too_short" | "missing_concepts" | "unlinked_concepts" | "passed";
export type ExplanationGrade = {
  passed: boolean;
  diagnosis: ExplanationDiagnosis;
  criteria: { id: string; label: string; passed: boolean }[];
  concepts: string[];
  missingConcepts: string[];
  coach: { acknowledgement: string; gap: string; nextPrompt: string };
  repair: { reason: ExplanationDiagnosis; title: string; prompt: string; focusTerms: string[] } | null;
  message: string;
  signals: { exactHintCopies: number; phraseCopy: number; sourceDominance: number; hintDominance: number; novelWordCount: number };
};
export function normalizeVietnamese(value: unknown): string;
export function gradeExplanation(options: { answer: string; input: TextInput; prompt?: string; hints?: string[]; activityId?: string }): ExplanationGrade;
