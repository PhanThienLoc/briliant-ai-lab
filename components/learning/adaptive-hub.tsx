"use client";

import { useEffect, useState } from "react";
import { evaluateAdaptiveMastery, type AdaptiveConceptState } from "../../lib/adaptive-mastery";
import { buildFallbackTodayQueue } from "../../lib/adaptive-hub-fallback";
import { projectConceptEvidence } from "../../lib/concept-evidence";
import { type ExpansionEdgeId, type ExpansionLabId } from "../../lib/expansion-catalog";
import {
  createLocalStorageLearningRepository,
  type LearningRepositorySnapshot,
} from "../../lib/learning-repository";
import { buildTodayQueue, type TodayQueue, type TodayQueueItem } from "../../lib/today-queue";
import { MasterySummary } from "./mastery-summary";
import { TodaySession } from "./today-session";

const HYDRATION_WARNING = "Không thể đọc đầy đủ tiến độ cục bộ. Hàng ôn hiện có vẫn dùng được; hãy xuất Learning Passport trước khi xóa dữ liệu trình duyệt.";

export type AdaptiveHubState = {
  hydrated: boolean;
  concepts: AdaptiveConceptState[];
  queue: TodayQueue;
  repositorySnapshot: LearningRepositorySnapshot | null;
  warning: string | null;
};

export const initialAdaptiveHubState: AdaptiveHubState = {
  hydrated: false,
  concepts: [],
  queue: { generatedAt: "", budgetMinutes: 30, totalMinutes: 0, items: [] },
  repositorySnapshot: null,
  warning: null,
};

export function useAdaptiveHubState(revision: number): AdaptiveHubState {
  const [state, setState] = useState<AdaptiveHubState>(initialAdaptiveHubState);
  const [clockRevision, setClockRevision] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setClockRevision((value) => value + 1), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let repositorySnapshot: LearningRepositorySnapshot | null = null;
    let concepts: AdaptiveConceptState[] = [];
    let queue: TodayQueue | null = null;
    const now = new Date();

    const hydrate = async () => {
      try {
        const repository = createLocalStorageLearningRepository(window.localStorage);
        repositorySnapshot = await repository.readSnapshot(now);
        concepts = projectConceptEvidence(repositorySnapshot, now)
          .map((concept) => evaluateAdaptiveMastery(concept, now));
        let queueFailed = false;
        try {
          queue = buildTodayQueue({
            concepts,
            repairs: repositorySnapshot.repairs,
            now,
            budgetMinutes: repositorySnapshot.adaptive.sessionMinutes,
          });
        } catch {
          queueFailed = true;
          queue = buildFallbackTodayQueue(concepts, repositorySnapshot.repairs, now, repositorySnapshot.adaptive.sessionMinutes);
        }
        const writeResult = queueFailed ? null : await repository.writeAdaptiveState({
          schemaVersion: 1,
          sessionMinutes: queue.budgetMinutes,
          lastGeneratedAt: queue.generatedAt,
          lastQueueIds: queue.items.map((item) => item.id),
        });

        if (cancelled) return;
        setState({
          hydrated: true,
          concepts,
          queue,
          repositorySnapshot,
          warning: repositorySnapshot.warnings.length || queueFailed || !writeResult?.ok ? HYDRATION_WARNING : null,
        });
      } catch {
        if (cancelled) return;
        setState((current) => ({
          ...current,
          hydrated: true,
          concepts: concepts.length ? concepts : current.concepts,
          queue: queue ?? current.queue,
          repositorySnapshot: repositorySnapshot ?? current.repositorySnapshot,
          warning: HYDRATION_WARNING,
        }));
      }
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [revision, clockRevision]);

  return state;
}

export function AdaptiveHub({
  state,
  onLesson,
  onExpansion,
  onDiagnostic,
}: {
  state: AdaptiveHubState;
  onLesson: (lessonId: string, activityId: string | null, mode: "practice" | "review") => void;
  onExpansion: (labId: ExpansionLabId, reviewDue: boolean, edgeId?: ExpansionEdgeId) => void;
  onDiagnostic: () => void;
}) {
  const openQueueItem = (item: TodayQueueItem) => {
    const target = item.target;
    if (!target) return;
    if (target.kind === "lesson") {
      onLesson(target.id, target.activityId, target.mode);
      return;
    }
    if (target.kind === "expansion") {
      onExpansion(target.id, target.mode === "review", target.edgeId);
    }
  };

  return (
    <div className="adaptive-hub" aria-busy={!state.hydrated}>
      {state.warning ? <p className="adaptive-hub-warning" role="status">{state.warning}</p> : null}
      {state.hydrated ? <TodaySession queue={state.queue} onOpen={openQueueItem} onDiagnostic={onDiagnostic} /> : <p className="session-loading" role="status">Đang đọc tiến độ trên thiết bị này…</p>}
      {state.hydrated ? <details className="home-analytics"><summary>Bằng chứng hiểu sâu</summary><MasterySummary concepts={state.concepts} /></details> : null}
    </div>
  );
}
