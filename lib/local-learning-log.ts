"use client";

export type LearningEventType =
  | "diagnostic_completed"
  | "activity_attempt"
  | "hint_opened"
  | "code_run"
  | "lesson_completed"
  | "delayed_review"
  | "scoring_dispute"
  | "repair_created"
  | "repair_resolved";

export type LearningOutcome = "pass" | "fail" | "opened" | "completed" | "timeout" | "runtime_error" | "submitted";

export type LearningEventInput = {
  eventType: LearningEventType;
  lessonId?: string;
  activityId?: string;
  outcome?: LearningOutcome;
  hintLevel?: number;
  durationMs?: number;
  errorCode?: string;
};

export type LocalLearningEvent = LearningEventInput & {
  id: string;
  occurredAt: string;
};

export type LocalLearningSummary = {
  totalEvents: number;
  codeRuns: number;
  codeFailures: number;
  scoringDisputes: number;
};

const STORAGE_KEY = "briliantai.learning-log.v1";
const MAX_EVENTS = 400;

function createEventId() {
  try {
    if (typeof window.crypto?.randomUUID === "function") return window.crypto.randomUUID();
  } catch {
    // Some local or privacy-restricted contexts expose crypto without randomUUID.
  }
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function readEvents(): LocalLearningEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(value) ? value.slice(-MAX_EVENTS) : [];
  } catch {
    return [];
  }
}

export function recordLearningEvent(input: LearningEventInput) {
  if (typeof window === "undefined") return;
  try {
    const event: LocalLearningEvent = {
      ...input,
      hintLevel: Math.max(0, Math.min(2, input.hintLevel ?? 0)),
      durationMs: input.durationMs === undefined ? undefined : Math.max(0, Math.min(3_600_000, Math.round(input.durationMs))),
      id: createEventId(),
      occurredAt: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...readEvents(), event].slice(-MAX_EVENTS)));
  } catch {
    // Local reflection data must never block the learning flow.
  }
}

export function getLocalLearningSummary(): LocalLearningSummary {
  const events = readEvents();
  const codeEvents = events.filter((event) => event.eventType === "code_run");
  return {
    totalEvents: events.length,
    codeRuns: codeEvents.length,
    codeFailures: codeEvents.filter((event) => event.outcome === "timeout" || event.outcome === "runtime_error").length,
    scoringDisputes: events.filter((event) => event.eventType === "scoring_dispute").length,
  };
}

export function getLocalLearningHistory(limit = 30): LocalLearningEvent[] {
  return readEvents().slice(-Math.max(1, Math.min(100, Math.round(limit)))).reverse();
}
