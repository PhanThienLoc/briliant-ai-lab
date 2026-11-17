import assert from "node:assert/strict";
import test from "node:test";
import { attentionSnapshot, denseForward, evaluateAiCandidates, gradientStep, tokenizeForEmbedding } from "../lib/r4-labs.mjs";

test("R4 dense/ReLU boundary: sign is decided after weighted sum and bias", () => {
  assert.equal(denseForward([2, -1], [1, 2], 1).activation, 1);
  assert.equal(denseForward([2, -1], [1, 2], 0).activation, 0);
  assert.equal(denseForward([2, -1], [1, 2], -1).activation, 0);
  assert.throws(() => denseForward([2, -1], [1], 0), /cùng kích thước/);
});

test("R4 backprop boundary: gradient direction alone does not guarantee lower loss", () => {
  const target = { x: 2, weight: 1, target: 6 };
  assert.equal(gradientStep({ ...target, learningRate: 0 }).nextLoss, 8);
  assert.equal(gradientStep({ ...target, learningRate: .25 }).nextLoss, 0);
  assert.ok(gradientStep({ ...target, learningRate: 1 }).nextLoss > 8);
  const oppositeSign = gradientStep({ x: 2, weight: 5, target: 6, learningRate: .25 });
  assert.ok(oppositeSign.gradient > 0 && oppositeSign.nextWeight < 5);
});

test("R4 token boundary: subword recovery still requires embedding lookup", () => {
  assert.deepEqual(tokenizeForEmbedding("model", "word").tokens, ["model"]);
  assert.deepEqual(tokenizeForEmbedding("unhelpful", "word").tokens, ["<unk>"]);
  const pieces = tokenizeForEmbedding("unhelpful", "subword");
  assert.deepEqual(pieces.tokens, ["un", "help", "ful"]);
  assert.equal(pieces.vectors.length, 3);
  assert.deepEqual(tokenizeForEmbedding("", "subword").pooled, [0, 0]);
});

test("R4 attention boundary: changing query changes normalized value mixture", () => {
  const subject = attentionSnapshot(1);
  const behavior = attentionSnapshot(0);
  assert.equal(subject.winner, "database");
  assert.equal(behavior.winner, "slowly");
  for (const snapshot of [subject, behavior]) {
    assert.ok(Math.abs(snapshot.weights.reduce((sum, value) => sum + value, 0) - 1) < 1e-12);
    assert.ok(snapshot.context.every((value) => value >= 0 && value <= 1));
  }
  assert.notDeepEqual(subject.context, behavior.context);
});

test("R4 evaluation boundary: every hard constraint is inclusive and necessary", () => {
  const eligible = (limits) => evaluateAiCandidates(limits).filter((item) => item.eligible).map((item) => item.id);
  assert.deepEqual(eligible({ minimumQuality: .87, maximumLatency: 650, maximumCost: .9 }), ["rag"]);
  assert.deepEqual(eligible({ minimumQuality: .88, maximumLatency: 650, maximumCost: .9 }), []);
  assert.deepEqual(eligible({ minimumQuality: .87, maximumLatency: 649, maximumCost: .9 }), []);
  assert.deepEqual(eligible({ minimumQuality: .87, maximumLatency: 650, maximumCost: .89 }), []);
});
