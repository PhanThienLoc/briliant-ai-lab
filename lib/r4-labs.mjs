export function relu(value) {
  return Math.max(0, Number(value) || 0);
}

export function denseForward(inputs, weights, bias = 0) {
  if (!Array.isArray(inputs) || !Array.isArray(weights) || inputs.length !== weights.length) {
    throw new TypeError("inputs và weights phải là hai vector cùng kích thước");
  }
  const contributions = inputs.map((value, index) => value * weights[index]);
  const preActivation = contributions.reduce((sum, value) => sum + value, Number(bias) || 0);
  return { contributions, preActivation, activation: relu(preActivation) };
}

export function gradientStep({ x = 2, weight = 1, target = 6, learningRate = 0.25 } = {}) {
  const prediction = x * weight;
  const error = prediction - target;
  const loss = 0.5 * error ** 2;
  const gradient = error * x;
  const nextWeight = weight - learningRate * gradient;
  const nextPrediction = x * nextWeight;
  const nextLoss = 0.5 * (nextPrediction - target) ** 2;
  return { prediction, error, loss, gradient, nextWeight, nextPrediction, nextLoss };
}

const embeddingVocabulary = {
  un: [0.9, 0.1],
  help: [0.2, 0.8],
  ful: [0.5, 0.5],
  model: [0.8, 0.4],
  "<unk>": [0, 0],
};

const subwordPieces = Object.keys(embeddingVocabulary)
  .filter((piece) => piece !== "<unk>")
  .sort((left, right) => right.length - left.length);

function splitSubwords(word) {
  const tokens = [];
  let cursor = 0;
  while (cursor < word.length) {
    const piece = subwordPieces.find((candidate) => word.startsWith(candidate, cursor));
    if (!piece) {
      tokens.push("<unk>");
      cursor += 1;
    } else {
      tokens.push(piece);
      cursor += piece.length;
    }
  }
  return tokens;
}

export function tokenizeForEmbedding(text, mode = "word") {
  const words = String(text).toLowerCase().match(/[a-z]+/g) ?? [];
  const tokens = mode === "subword"
    ? words.flatMap(splitSubwords)
    : words.map((word) => word in embeddingVocabulary ? word : "<unk>");
  const vectors = tokens.map((token) => embeddingVocabulary[token] ?? embeddingVocabulary["<unk>"]);
  const pooled = vectors.length
    ? vectors[0].map((_, axis) => vectors.reduce((sum, vector) => sum + vector[axis], 0) / vectors.length)
    : [0, 0];
  return { tokens, vectors, pooled, unknownCount: tokens.filter((token) => token === "<unk>").length };
}

export const attentionTokens = [
  { token: "database", key: [0.95, 0.05], value: [1, 0] },
  { token: "scales", key: [0.55, 0.45], value: [0.55, 0.45] },
  { token: "slowly", key: [0.1, 0.9], value: [0, 1] },
];

function softmax(values) {
  const maximum = Math.max(...values);
  const exponentials = values.map((value) => Math.exp(value - maximum));
  const total = exponentials.reduce((sum, value) => sum + value, 0);
  return exponentials.map((value) => value / total);
}

export function attentionSnapshot(subjectFocus = 0.5, tokens = attentionTokens) {
  const focus = Math.max(0, Math.min(1, Number(subjectFocus) || 0));
  const query = [focus, 1 - focus];
  const scale = Math.sqrt(query.length);
  const scores = tokens.map((item) => item.key.reduce((sum, value, axis) => sum + query[axis] * value, 0) / scale);
  const weights = softmax(scores);
  const context = tokens[0].value.map((_, axis) => tokens.reduce((sum, item, index) => sum + weights[index] * item.value[axis], 0));
  const winnerIndex = weights.indexOf(Math.max(...weights));
  return { query, scores, weights, context, winner: tokens[winnerIndex]?.token ?? null };
}

export const aiCandidates = [
  { id: "small", label: "Small model", quality: 0.78, latency: 240, cost: 0.3 },
  { id: "large", label: "Large model", quality: 0.91, latency: 1400, cost: 1.6 },
  { id: "rag", label: "Mid model + RAG", quality: 0.87, latency: 650, cost: 0.9 },
];

export function evaluateAiCandidates(constraints, candidates = aiCandidates) {
  const minimumQuality = Number(constraints.minimumQuality);
  const maximumLatency = Number(constraints.maximumLatency);
  const maximumCost = Number(constraints.maximumCost);
  return candidates.map((candidate) => {
    const checks = {
      quality: candidate.quality >= minimumQuality,
      latency: candidate.latency <= maximumLatency,
      cost: candidate.cost <= maximumCost,
    };
    return { ...candidate, checks, eligible: Object.values(checks).every(Boolean) };
  });
}
