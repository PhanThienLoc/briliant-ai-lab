export const thresholdCases = [
  { id: "A", score: 0.91, actual: 1 }, { id: "B", score: 0.78, actual: 1 },
  { id: "C", score: 0.72, actual: 0 }, { id: "D", score: 0.64, actual: 1 },
  { id: "E", score: 0.55, actual: 0 }, { id: "F", score: 0.51, actual: 1 },
  { id: "G", score: 0.43, actual: 0 }, { id: "H", score: 0.31, actual: 1 },
  { id: "I", score: 0.22, actual: 0 }, { id: "J", score: 0.08, actual: 0 },
];

export function confusionAtThreshold(threshold, cases = thresholdCases) {
  const matrix = { tp: 0, fp: 0, fn: 0, tn: 0 };
  for (const item of cases) {
    const predicted = item.score >= threshold ? 1 : 0;
    if (predicted && item.actual) matrix.tp += 1;
    else if (predicted) matrix.fp += 1;
    else if (item.actual) matrix.fn += 1;
    else matrix.tn += 1;
  }
  const precision = matrix.tp / Math.max(1, matrix.tp + matrix.fp);
  const recall = matrix.tp / Math.max(1, matrix.tp + matrix.fn);
  return { ...matrix, precision, recall };
}

export function splitCounts(total, trainPercent, validationPercent) {
  const train = Math.round(total * trainPercent / 100);
  const validation = Math.round(total * validationPercent / 100);
  return { train, validation, test: Math.max(0, total - train - validation) };
}

export function leakageRisk({ splitFirst, fitOnTrainOnly }) {
  return { clean: Boolean(splitFirst && fitOnTrainOnly), leaksThrough: !splitFirst ? "split" : !fitOnTrainOnly ? "preprocessing" : null };
}

export const knnPoints = [
  { x: 20, y: 30, label: "A" }, { x: 24, y: 36, label: "A" }, { x: 27, y: 42, label: "A" },
  { x: 55, y: 88, label: "B" }, { x: 60, y: 94, label: "B" }, { x: 64, y: 100, label: "B" },
];
export const knnQuery = { x: 38, y: 82 };

export function knnPrediction(points = knnPoints, query = knnQuery, k = 3, scaled = false) {
  const xScale = scaled ? 44 : 1;
  const yScale = scaled ? 180 : 1;
  const ranked = points.map((point) => ({ ...point, distance: Math.hypot((point.x - query.x) / xScale, (point.y - query.y) / yScale) })).sort((a, b) => a.distance - b.distance);
  const neighbors = ranked.slice(0, k);
  const votes = neighbors.reduce((counts, point) => ({ ...counts, [point.label]: (counts[point.label] ?? 0) + 1 }), {});
  const prediction = Object.entries(votes).sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
  return { prediction, neighbors };
}

export function learningCurve(capacity, regularization) {
  const trainLoss = Math.max(0.08, 0.75 - capacity * 0.095 + regularization * 0.08);
  const overfit = Math.max(0, capacity - 4) * 0.09 * (1 - regularization) ** 2;
  const validationLoss = 0.22 + Math.abs(capacity - 4) * 0.02 + overfit + regularization * 0.03;
  return { trainLoss, validationLoss, gap: validationLoss - trainLoss };
}
