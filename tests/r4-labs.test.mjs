import assert from "node:assert/strict";
import test from "node:test";
import { attentionSnapshot, denseForward, evaluateAiCandidates, gradientStep, tokenizeForEmbedding } from "../lib/r4-labs.mjs";

test("dense forward pass separates weighted sum from ReLU", () => {
  assert.deepEqual(denseForward([2, -1], [1, 2], 1), {
    contributions: [2, -2], preActivation: 1, activation: 1,
  });
  assert.equal(denseForward([1, 2], [-2, -1], 0).activation, 0);
});

test("backprop gradient points to a lower-loss weight update", () => {
  const step = gradientStep({ x: 2, weight: 1, target: 6, learningRate: 0.25 });
  assert.equal(step.gradient, -8);
  assert.equal(step.nextWeight, 3);
  assert.equal(step.nextLoss, 0);
  assert.ok(step.nextLoss < step.loss);
});

test("subword tokenization recovers an unseen word without unknown tokens", () => {
  const wordLevel = tokenizeForEmbedding("unhelpful model", "word");
  const subword = tokenizeForEmbedding("unhelpful model", "subword");
  assert.equal(wordLevel.unknownCount, 1);
  assert.deepEqual(subword.tokens, ["un", "help", "ful", "model"]);
  assert.equal(subword.unknownCount, 0);
});

test("attention shifts toward the token aligned with the query", () => {
  const subject = attentionSnapshot(0.9);
  const behavior = attentionSnapshot(0.1);
  assert.equal(subject.winner, "database");
  assert.equal(behavior.winner, "slowly");
  assert.ok(Math.abs(behavior.weights.reduce((sum, weight) => sum + weight, 0) - 1) < 1e-9);
});

test("AI evaluation applies quality, latency and cost as simultaneous gates", () => {
  const results = evaluateAiCandidates({ minimumQuality: 0.85, maximumLatency: 800, maximumCost: 1 });
  assert.deepEqual(results.filter((candidate) => candidate.eligible).map((candidate) => candidate.id), ["rag"]);
  assert.equal(results.find((candidate) => candidate.id === "small").checks.quality, false);
  assert.equal(results.find((candidate) => candidate.id === "large").checks.latency, false);
});
