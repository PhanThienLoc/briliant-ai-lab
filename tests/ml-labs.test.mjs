import assert from "node:assert/strict";
import test from "node:test";
import { confusionAtThreshold, knnPrediction, leakageRisk, learningCurve, splitCounts } from "../lib/ml-labs.mjs";

test("threshold changes the precision/recall operating point", () => {
  const strict = confusionAtThreshold(.7);
  const open = confusionAtThreshold(.5);
  assert.ok(open.recall > strict.recall);
  assert.ok(open.fp >= strict.fp);
  assert.equal(open.recall, .8);
});

test("split simulator preserves the whole dataset", () => {
  assert.deepEqual(splitCounts(30, 60, 20), { train: 18, validation: 6, test: 6 });
});

test("leakage firewall requires both ordering constraints", () => {
  assert.equal(leakageRisk({ splitFirst: true, fitOnTrainOnly: true }).clean, true);
  assert.equal(leakageRisk({ splitFirst: false, fitOnTrainOnly: true }).clean, false);
  assert.equal(leakageRisk({ splitFirst: true, fitOnTrainOnly: false }).clean, false);
});

test("KNN scaling changes which neighborhood dominates", () => {
  assert.equal(knnPrediction(undefined, undefined, 3, false).prediction, "B");
  assert.equal(knnPrediction(undefined, undefined, 3, true).prediction, "A");
});

test("regularization can close the generalization gap", () => {
  const overfit = learningCurve(8, 0);
  const balanced = learningCurve(6, .5);
  assert.ok(overfit.gap > balanced.gap);
  assert.ok(balanced.gap < .12);
});
