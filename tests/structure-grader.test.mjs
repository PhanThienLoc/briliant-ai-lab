import assert from "node:assert/strict";
import test from "node:test";
import { buildBfsTrace, gradeBfsBehavior, passesQueueBehaviorChallenge, simulateQueue } from "../lib/structure-grader.mjs";

test("queue grader checks the complete FIFO operation trace", () => {
  const operations = ["enqueue:A", "enqueue:B", "enqueue:C", "dequeue", "dequeue"];
  const result = simulateQueue(operations);
  assert.deepEqual(result.output, ["A", "B"]);
  assert.deepEqual(result.queue, ["C"]);
  assert.equal(result.states.length, 5);
  assert.equal(passesQueueBehaviorChallenge(operations), true);
  assert.equal(passesQueueBehaviorChallenge(["enqueue:C", "enqueue:B", "enqueue:A", "dequeue", "dequeue"]), false);
});

test("BFS grader validates queue states on a graph variant", () => {
  const graph = { S: ["A", "B"], A: ["C"], B: ["D"], C: [], D: [] };
  const expected = buildBfsTrace(graph, "S");
  const valid = gradeBfsBehavior(graph, "S", { order: expected.order, queueStates: expected.steps.map((step) => step.queueAfter) });
  const guessedFinalOnly = gradeBfsBehavior(graph, "S", { order: expected.order, queueStates: [] });

  assert.deepEqual(expected.order, ["S", "A", "B", "C", "D"]);
  assert.equal(valid.passed, true);
  assert.equal(guessedFinalOnly.orderPassed, true);
  assert.equal(guessedFinalOnly.statesPassed, false);
  assert.equal(guessedFinalOnly.passed, false);
});
