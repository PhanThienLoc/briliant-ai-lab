import type { AdaptiveConceptState, AdaptiveMasteryState } from "./adaptive-mastery.ts";
import {
  expansionLabs,
  prerequisiteEdges,
  type ExpansionEdgeId,
  type ExpansionLabId,
} from "./expansion-catalog.ts";
import type { RepairItemSnapshot } from "./learning-repository.ts";

export type LearningTarget =
  | { kind: "lesson"; id: string; activityId: string | null; mode: "practice" | "review" }
  | { kind: "expansion"; id: ExpansionLabId; mode: "practice" | "review"; edgeId?: ExpansionEdgeId };

export type TodayQueueItem = {
  id: string;
  type: "review" | "repair" | "bridge" | "practice" | "new" | "reflection";
  title: string;
  trackId: string;
  minutes: number;
  score: number;
  reason: string;
  evidenceNeeded: string;
  target: LearningTarget | null;
};

export type TodayQueueInput = {
  concepts: AdaptiveConceptState[];
  repairs: RepairItemSnapshot[];
  now?: Date;
  budgetMinutes?: number;
};

export type TodayQueue = {
  generatedAt: string;
  budgetMinutes: number;
  totalMinutes: number;
  items: TodayQueueItem[];
};

type RankedCandidate = TodayQueueItem & {
  oldestDueAt: number;
  blockedEdgeCount: number;
};

const HOUR_MS = 60 * 60 * 1_000;

const dueScore = (overdueHours: number) => Math.min(40, 30 + Math.floor(Math.max(0, overdueHours) / 24));
const misconceptionScore = (attempts: number, disputed: boolean) => attempts <= 0 && !disputed ? 0 : Math.min(25, 15 + Math.max(0, attempts - 1) * 5 + (disputed ? 5 : 0));
const prerequisiteScore = (blockedEdgeCount: number) => Math.min(15, blockedEdgeCount * 5);
const assistanceScore = (hints: number, attempts: number) => Math.min(10, Math.min(6, hints * 3) + (attempts >= 3 ? 4 : 0));
const freshnessScore = (state: AdaptiveMasteryState) => state === "unexplored" ? 10 : state === "learning" ? 5 : 0;

const missingGateLabels = {
  practice: "thực hành",
  variant: "biến thể",
  transfer: "chuyển giao",
  delayed: "ôn trì hoãn",
} as const;

function parsedTimestamp(value: string | null): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function conceptScore(concept: AdaptiveConceptState, now: Date): number {
  const dueAt = parsedTimestamp(concept.nextReviewAt);
  const overdueHours = dueAt !== null && dueAt <= now.getTime()
    ? (now.getTime() - dueAt) / HOUR_MS
    : -1;

  return (overdueHours >= 0 ? dueScore(overdueHours) : 0)
    + misconceptionScore(concept.unresolvedMisconceptions, false)
    + prerequisiteScore(concept.blockedOutgoingEdgeIds.length)
    + assistanceScore(concept.totalHints, concept.retryCount)
    + freshnessScore(concept.state);
}

function targetForConcept(
  concept: AdaptiveConceptState,
  mode: "practice" | "review",
): LearningTarget {
  if (concept.trackId === "r0") {
    return { kind: "lesson", id: concept.id, activityId: null, mode };
  }
  return { kind: "expansion", id: concept.id as ExpansionLabId, mode };
}

function missingGateLabel(concept: AdaptiveConceptState): string {
  const missing = (Object.keys(missingGateLabels) as Array<keyof typeof missingGateLabels>)
    .find((gate) => concept.evidence[gate].status === "missing");
  return missing ? missingGateLabels[missing] : "củng cố";
}

function hintSuffix(hints: number): string {
  return hints > 0 ? ` và đã cần ${hints} gợi ý` : "";
}

function compareCandidates(left: RankedCandidate, right: RankedCandidate): number {
  return right.score - left.score
    || left.oldestDueAt - right.oldestDueAt
    || right.blockedEdgeCount - left.blockedEdgeCount
    || left.id.localeCompare(right.id, "en");
}

function reviewCandidates(concepts: AdaptiveConceptState[], now: Date): RankedCandidate[] {
  return concepts.flatMap((concept) => {
    const dueAt = parsedTimestamp(concept.nextReviewAt);
    if (concept.state !== "review_due" || dueAt === null || dueAt > now.getTime()) return [];
    const overdueDays = Math.floor((now.getTime() - dueAt) / (24 * HOUR_MS));
    const timing = overdueDays ? `đã quá hạn ${overdueDays} ngày` : "vừa đến hạn ôn";
    return [{
      id: `review:${concept.id}`,
      type: "review" as const,
      title: `Ôn ${concept.title}`,
      trackId: concept.trackId,
      minutes: 5,
      score: conceptScore(concept, now),
      reason: `Ôn ${concept.title} trước vì bài ${timing}${hintSuffix(concept.totalHints)}.`,
      evidenceNeeded: `Hoàn thành bằng chứng ôn trì hoãn cho ${concept.title}.`,
      target: targetForConcept(concept, "review"),
      oldestDueAt: dueAt,
      blockedEdgeCount: concept.blockedOutgoingEdgeIds.length,
    }];
  }).sort(compareCandidates);
}

function repairCandidates(
  concepts: AdaptiveConceptState[],
  repairs: RepairItemSnapshot[],
  now: Date,
): RankedCandidate[] {
  const conceptsById = new Map(concepts.map((concept) => [concept.id, concept]));
  return repairs.map((repair): RankedCandidate => {
    const concept = conceptsById.get(repair.lessonId);
    const blockedEdgeCount = concept?.blockedOutgoingEdgeIds.length ?? 0;
    const dueAt = concept ? parsedTimestamp(concept.nextReviewAt) : null;
    const overdueHours = dueAt !== null && dueAt <= now.getTime()
      ? (now.getTime() - dueAt) / HOUR_MS
      : -1;
    const score = (overdueHours >= 0 ? dueScore(overdueHours) : 0)
      + misconceptionScore(repair.attempts, repair.disputed)
      + prerequisiteScore(blockedEdgeCount)
      + assistanceScore(repair.hintLevel, repair.attempts)
      + freshnessScore(concept?.state ?? "learning");
    const disputeSuffix = repair.disputed ? " và bằng chứng đang có tranh chấp" : "";

    return {
      id: `repair:${repair.id}`,
      type: "repair",
      title: repair.title,
      trackId: concept?.trackId ?? "r0",
      minutes: 8,
      score,
      reason: `Sửa ${repair.title} vì cùng một mắt xích đã vướng ${repair.attempts} lần${disputeSuffix}.`,
      evidenceNeeded: repair.prompt,
      target: { kind: "lesson", id: repair.lessonId, activityId: repair.activityId, mode: "practice" },
      oldestDueAt: dueAt ?? Number.POSITIVE_INFINITY,
      blockedEdgeCount,
    };
  }).sort(compareCandidates);
}

function bridgeCandidates(concepts: AdaptiveConceptState[], now: Date): RankedCandidate[] {
  return concepts.flatMap((concept) => {
    if (concept.state !== "practiced" && concept.state !== "mastered") return [];
    const edge = concept.blockedOutgoingEdgeIds
      .map((edgeId) => prerequisiteEdges.find((candidate) => candidate.id === edgeId && candidate.from === concept.id))
      .find((candidate) => candidate !== undefined);
    if (!edge) return [];
    const destination = expansionLabs.find((lab) => lab.id === edge.to);
    if (!destination) return [];
    const dueAt = parsedTimestamp(concept.nextReviewAt);

    return [{
      id: `bridge:${edge.id}:${edge.to}`,
      type: "bridge" as const,
      title: `Cầu nối tới ${destination.title}`,
      trackId: concept.trackId,
      minutes: 8,
      score: conceptScore(concept, now),
      reason: `Làm cầu nối này để mở ${destination.title}.`,
      evidenceNeeded: `Vượt thử thách prerequisite ${edge.id} để mở ${destination.title}.`,
      target: {
        kind: "expansion" as const,
        id: edge.from,
        mode: "practice" as const,
        edgeId: edge.id,
      },
      oldestDueAt: dueAt ?? Number.POSITIVE_INFINITY,
      blockedEdgeCount: concept.blockedOutgoingEdgeIds.length,
    }];
  }).sort(compareCandidates);
}

function learningCandidates(concepts: AdaptiveConceptState[], now: Date): RankedCandidate[] {
  return concepts.flatMap((concept) => {
    if (concept.state !== "learning" && concept.state !== "unexplored") return [];
    if (concept.trackId !== "r0" && !concept.unlocked) return [];

    const isNew = concept.state === "unexplored";
    const gateLabel = missingGateLabel(concept);
    const hasUnlockValue = concept.blockedOutgoingEdgeIds.length > 0;
    const reason = isNew
      ? hasUnlockValue
        ? `Bắt đầu ${concept.title} vì đây là prerequisite có giá trị mở khóa cao nhất.`
        : `Bắt đầu ${concept.title} để tạo bằng chứng thực hành đầu tiên.`
      : `Tiếp tục ${concept.title} vì bằng chứng ${gateLabel} còn thiếu.`;
    const dueAt = parsedTimestamp(concept.nextReviewAt);

    return [{
      id: `${isNew ? "new" : "practice"}:${concept.id}`,
      type: isNew ? "new" as const : "practice" as const,
      title: isNew ? `Bắt đầu ${concept.title}` : `Tiếp tục ${concept.title}`,
      trackId: concept.trackId,
      minutes: 14,
      score: conceptScore(concept, now),
      reason,
      evidenceNeeded: `Hoàn thành bằng chứng ${gateLabel} cho ${concept.title}.`,
      target: targetForConcept(concept, "practice"),
      oldestDueAt: dueAt ?? Number.POSITIVE_INFINITY,
      blockedEdgeCount: concept.blockedOutgoingEdgeIds.length,
    }];
  }).sort(compareCandidates);
}

function boundedBudget(value: number | undefined): number {
  const requested = typeof value === "number" && Number.isFinite(value) ? value : 30;
  return Math.min(60, Math.max(15, requested));
}

function publicItem(candidate: RankedCandidate): TodayQueueItem {
  return {
    id: candidate.id,
    type: candidate.type,
    title: candidate.title,
    trackId: candidate.trackId,
    minutes: candidate.minutes,
    score: candidate.score,
    reason: candidate.reason,
    evidenceNeeded: candidate.evidenceNeeded,
    target: candidate.target,
  };
}

export function buildTodayQueue(input: TodayQueueInput): TodayQueue {
  const now = input.now ?? new Date();
  const budgetMinutes = boundedBudget(input.budgetMinutes);
  const slots = [
    reviewCandidates(input.concepts, now),
    [...repairCandidates(input.concepts, input.repairs, now), ...bridgeCandidates(input.concepts, now)].sort(compareCandidates),
    learningCandidates(input.concepts, now),
  ];
  const items: TodayQueueItem[] = [];
  let totalMinutes = 0;

  for (const candidates of slots) {
    const candidate = candidates[0];
    if (candidate && totalMinutes + candidate.minutes <= budgetMinutes) {
      items.push(publicItem(candidate));
      totalMinutes += candidate.minutes;
    }
  }

  if (items.length > 0 && totalMinutes + 3 <= budgetMinutes) {
    items.push({
      id: "reflection:session",
      type: "reflection",
      title: "Tự phản tư cuối phiên",
      trackId: items.at(-1)?.trackId ?? "adaptive",
      minutes: 3,
      score: 0,
      reason: "Khép phiên bằng cách gọi tên bằng chứng vừa tạo và điểm còn chưa chắc.",
      evidenceNeeded: "Viết một điều đã hiểu và một câu hỏi cần kiểm tra lại.",
      target: null,
    });
    totalMinutes += 3;
  }

  return {
    generatedAt: now.toISOString(),
    budgetMinutes,
    totalMinutes,
    items,
  };
}
