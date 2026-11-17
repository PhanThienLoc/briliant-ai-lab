const cleanLabel = (value) => String(value ?? "").trim().toUpperCase().slice(0, 8);

export function simulateQueue(operations) {
  const queue = [];
  const output = [];
  const states = [];
  for (const rawOperation of operations) {
    const [kind, rawValue] = String(rawOperation).split(":");
    if (kind === "enqueue") {
      const value = cleanLabel(rawValue);
      if (!value) return { queue, output, states, error: "enqueue cần một giá trị." };
      queue.push(value);
    } else if (kind === "dequeue") {
      if (!queue.length) return { queue, output, states, error: "Không thể dequeue một queue rỗng." };
      output.push(queue.shift());
    } else {
      return { queue, output, states, error: "Operation không hợp lệ." };
    }
    states.push({ operation: String(rawOperation), queue: [...queue], output: [...output] });
  }
  return { queue, output, states, error: null };
}

export function passesQueueBehaviorChallenge(operations) {
  const result = simulateQueue(operations);
  return !result.error && result.queue.join("|") === "C" && result.output.join("|") === "A|B" && result.states.length === 5;
}

export function buildBfsTrace(graph, start) {
  const queue = [start];
  const visited = [];
  const steps = [];
  while (queue.length) {
    const dequeued = queue.shift();
    if (visited.includes(dequeued)) continue;
    visited.push(dequeued);
    const enqueued = (graph[dequeued] ?? []).filter((neighbor) => !visited.includes(neighbor) && !queue.includes(neighbor));
    queue.push(...enqueued);
    steps.push({ dequeued, enqueued, queueAfter: [...queue], visited: [...visited] });
  }
  return { order: visited, steps };
}

export function gradeBfsBehavior(graph, start, submission) {
  const expected = buildBfsTrace(graph, start);
  const order = Array.isArray(submission?.order) ? submission.order.map(cleanLabel) : [];
  const queueStates = Array.isArray(submission?.queueStates) ? submission.queueStates.map((state) => Array.isArray(state) ? state.map(cleanLabel) : []) : [];
  const orderPassed = order.join("|") === expected.order.join("|");
  const statesPassed = queueStates.length === expected.steps.length && queueStates.every((state, index) => state.join("|") === expected.steps[index].queueAfter.join("|"));
  return { passed: orderPassed && statesPassed, orderPassed, statesPassed, expected };
}

export function advanceBfsPrediction(graph, state, prediction) {
  const expected = state.queue[0] ?? null;
  const normalized = cleanLabel(prediction);
  if (!expected || normalized !== expected) return { correct: false, expected, state };
  const [, ...rest] = state.queue;
  const visited = state.visited.includes(expected) ? state.visited : [...state.visited, expected];
  const enqueued = (graph[expected] ?? []).filter((neighbor) => !visited.includes(neighbor) && !rest.includes(neighbor));
  return {
    correct: true,
    expected,
    state: { queue: [...rest, ...enqueued], visited, queueStates: [...state.queueStates, [...rest, ...enqueued]] },
  };
}
