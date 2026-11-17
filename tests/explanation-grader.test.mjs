import assert from "node:assert/strict";
import test from "node:test";
import { gradeExplanation } from "../lib/explanation-grader.mjs";

const vectorInput = {
  minLength: 70,
  rubricTerms: ["feature", "trọng số", "đóng góp", "cộng", "prediction"],
  requiredTerms: 3,
};

const prompt = "Giải thích dot product cho người chưa học Machine Learning, không chỉ đọc lại công thức.";
const hints = [
  "Dùng hình ảnh nhiều người cùng đóng góp vào quyết định.",
  "Có feature, trọng số, từng đóng góp và bước cộng thành prediction.",
];

test("a causal explanation written in the learner's own words passes", () => {
  const result = gradeExplanation({
    answer: "Dot product giống như một hội đồng chấm điểm. Mỗi feature mang một giá trị, trọng số cho biết tiếng nói của nó mạnh đến đâu, vì vậy ta nhân từng cặp để tạo đóng góp rồi cộng lại thành prediction cuối cùng.",
    input: vectorInput,
    prompt,
    hints,
  });

  assert.equal(result.passed, true);
  assert.ok(result.criteria.every((criterion) => criterion.passed));
});

test("pasting both hints no longer bypasses the explanation rubric", () => {
  const result = gradeExplanation({ answer: hints.join(" "), input: vectorInput, prompt, hints });

  assert.equal(result.passed, false);
  assert.equal(result.diagnosis, "copied_hint");
  assert.equal(result.criteria.find((criterion) => criterion.id === "originality")?.passed, false);
  assert.match(result.coach.gap, /bám quá sát/);
  assert.match(result.coach.nextPrompt, /Đóng gợi ý lại/);
});

test("pasted hints remain blocked after adding a shallow connector", () => {
  const answer = `${hints.join(" ")} Vì vậy feature và trọng số tạo prediction.`;
  const result = gradeExplanation({ answer, input: vectorInput, prompt, hints });

  assert.equal(result.passed, false);
  assert.equal(result.diagnosis, "copied_hint");
  assert.ok(result.signals.exactHintCopies >= 1);
});

test("a long keyword list without an original causal model is rejected", () => {
  const result = gradeExplanation({
    answer: "feature trọng số đóng góp cộng prediction vì feature trọng số đóng góp cộng prediction feature trọng số đóng góp cộng prediction",
    input: vectorInput,
    prompt,
    hints,
  });

  assert.equal(result.passed, false);
  assert.equal(result.diagnosis, "keyword_dump");
  assert.equal(result.criteria.find((criterion) => criterion.id === "originality")?.passed, false);
});

test("feedback identifies one repair action instead of returning a dry checklist", () => {
  const result = gradeExplanation({
    answer: "Feature và trọng số đều liên quan đến prediction, nhưng tôi chưa rõ chúng nối nhau thế nào trong dot product.",
    input: vectorInput,
    prompt,
    hints,
  });

  assert.equal(result.passed, false);
  assert.ok(result.coach.acknowledgement.length > 20);
  assert.ok(result.coach.gap.length > 30);
  assert.ok(result.repair.prompt.length > 30);
  assert.equal(result.repair.reason, result.diagnosis);
});
