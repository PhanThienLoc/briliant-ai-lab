import type { AdaptiveConceptState } from "./adaptive-mastery.ts";
import { isExpansionLabId } from "./expansion-catalog.ts";
import type { RepairItemSnapshot } from "./learning-repository.ts";
import type { TodayQueue, TodayQueueItem } from "./today-queue.ts";

// An independent, minimal route when the ranking policy cannot compute a session.
// Keep the existing due-date order and the learner's repair ordering.
export function buildFallbackTodayQueue(
  concepts: AdaptiveConceptState[],
  repairs: RepairItemSnapshot[],
  now: Date,
  requestedMinutes: number,
): TodayQueue {
  const budgetMinutes = Number.isFinite(requestedMinutes) ? Math.min(60, Math.max(15, requestedMinutes)) : 30;
  const items: TodayQueueItem[] = [];
  let totalMinutes = 0;
  const due = concepts.filter((concept) => concept.state === "review_due"
    && concept.nextReviewAt && Date.parse(concept.nextReviewAt) <= now.getTime())
    .sort((a, b) => Date.parse(a.nextReviewAt!) - Date.parse(b.nextReviewAt!) || a.id.localeCompare(b.id));

  for (const concept of due) {
    if (totalMinutes + 5 > budgetMinutes) break;
    const target = concept.trackId === "r0"
      ? { kind: "lesson" as const, id: concept.id, activityId: null, mode: "review" as const }
      : isExpansionLabId(concept.id)
        ? { kind: "expansion" as const, id: concept.id, mode: "review" as const }
        : null;
    if (!target) continue;
    items.push({
      id: `review:${concept.id}`, type: "review", title: `Ôn ${concept.title}`,
      trackId: concept.trackId, minutes: 5, score: 0,
      reason: "Bài ôn đã đến hạn; giữ thứ tự theo thời điểm đến hạn.",
      evidenceNeeded: `Hoàn thành bài ôn trì hoãn cho ${concept.title}.`, target,
    });
    totalMinutes += 5;
  }

  for (const repair of repairs) {
    if (totalMinutes + 8 > budgetMinutes) break;
    items.push({
      id: `repair:${repair.id}`, type: "repair", title: repair.title,
      trackId: "r0", minutes: 8, score: 0,
      reason: "Mục cần sửa đã có trong hàng ôn cục bộ.",
      evidenceNeeded: repair.prompt,
      target: { kind: "lesson", id: repair.lessonId, activityId: repair.activityId, mode: "practice" },
    });
    totalMinutes += 8;
  }

  return { generatedAt: now.toISOString(), budgetMinutes, totalMinutes, items };
}
