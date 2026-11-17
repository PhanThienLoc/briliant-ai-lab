import { getExplanationRubric } from "./explanation-rubrics.mjs";

const CAUSAL_MARKERS = [
  "vi", "nen", "do do", "dan den", "khien", "neu", "khi", "boi vi",
  "vi vay", "trong khi", "con", "thay vi", "ket qua", "tu do",
  "de", "roi", "thanh",
];

const STOP_WORDS = new Set([
  "va", "la", "cua", "cho", "mot", "nhung", "cac", "nay", "do", "thi",
  "khi", "neu", "nen", "voi", "trong", "duoc", "khong", "co", "the",
  "vao", "ra", "tu", "sau", "truoc", "hon", "con", "se", "de", "vi",
]);

export function normalizeVietnamese(value) {
  return String(value ?? "")
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9_+.-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value) {
  return normalizeVietnamese(value)
    .split(" ")
    .map((token) => token.replace(/^[.+-]+|[.+-]+$/g, ""))
    .filter(Boolean);
}

function meaningfulTokens(value) {
  return tokens(value).filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

function includesPhrase(answer, phrase) {
  const answerItems = tokens(answer);
  const phraseItems = tokens(phrase);
  if (!phraseItems.length || phraseItems.length > answerItems.length) return false;
  return answerItems.some((_, index) => phraseItems.every((token, offset) => answerItems[index + offset] === token));
}

function hintSimilarity(answerTokens, hintTokens) {
  const meaningful = hintTokens.filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
  if (!meaningful.length) return 0;
  const answerSet = new Set(answerTokens);
  return meaningful.filter((token) => answerSet.has(token)).length / meaningful.length;
}

function ngrams(items, size) {
  if (items.length < size) return [];
  return Array.from({ length: items.length - size + 1 }, (_, index) => items.slice(index, index + size).join(" "));
}

function copiedPhraseRatio(answer, hints) {
  const answerGrams = ngrams(tokens(answer), 4);
  if (!answerGrams.length) return 0;
  const hintGrams = new Set(hints.flatMap((hint) => ngrams(tokens(hint), 4)));
  return answerGrams.filter((gram) => hintGrams.has(gram)).length / answerGrams.length;
}

function buildCoach({ diagnosis, concepts, missingConcepts, input }) {
  const recognized = concepts.length
    ? `Tôi thấy ông đã chạm đúng vào ${concepts.slice(0, 2).join(" và ")}.`
    : "Tôi thấy ông đang cố diễn đạt cơ chế bằng lời của mình.";
  const chainTerms = input.rubricTerms.slice(0, Math.min(3, input.rubricTerms.length));

  if (diagnosis === "copied_hint") {
    return {
      acknowledgement: "Ông đã tìm đúng vùng kiến thức cần dùng.",
      gap: "Nhưng câu trả lời đang bám quá sát câu chữ của gợi ý, nên tôi chưa thể biết mối nối nào thực sự nằm trong mental model của ông.",
      nextPrompt: `Đóng gợi ý lại. Hãy tự nối ${chainTerms.join(" → ")} và nói điều gì sẽ thay đổi ở kết quả nếu mắt xích đầu tiên thay đổi. Chỉ cần 2–3 câu.`,
    };
  }
  if (diagnosis === "keyword_dump") {
    return {
      acknowledgement: recognized,
      gap: "Các khái niệm đang được liệt kê hoặc lặp lại, nhưng chưa tạo thành một cơ chế có đầu vào và hệ quả.",
      nextPrompt: `Chọn một đường đi duy nhất: ${chainTerms.join(" → ")}. Viết lại theo khung “vì … nên …, dẫn đến …”, rồi thêm một ví dụ nhỏ.`,
    };
  }
  if (diagnosis === "missing_concepts") {
    return {
      acknowledgement: recognized,
      gap: `Mắt xích còn thiếu là ${missingConcepts.slice(0, 2).join(" và ") || "cơ chế trung gian"}; vì thiếu nó nên người nghe chưa thấy kết quả được tạo ra thế nào.`,
      nextPrompt: `Bổ sung một câu nối ${concepts[0] ?? chainTerms[0]} với ${missingConcepts[0] ?? chainTerms[1]}: cái trước tác động lên cái sau ra sao?`,
    };
  }
  if (diagnosis === "unlinked_concepts") {
    return {
      acknowledgement: recognized,
      gap: "Các ý chính đã xuất hiện, nhưng chúng đang đứng cạnh nhau thay vì giải thích cái nào gây ra cái nào.",
      nextPrompt: `Viết thêm đúng một câu theo khung: “Vì ${chainTerms[0]} … nên ${chainTerms[1]} …, dẫn đến ${chainTerms[2] ?? "kết quả"} …”.`,
    };
  }
  if (diagnosis === "too_short") {
    return {
      acknowledgement: recognized,
      gap: "Câu hiện tại mới giống kết luận; nó chưa đủ phần “bên trong máy” để một người mới có thể lần theo.",
      nextPrompt: `Thêm một ví dụ nhỏ và mô tả lần lượt ${chainTerms.join(" → ")}. Không cần viết dài hơn phần cơ chế đó.`,
    };
  }
  return {
    acknowledgement: recognized,
    gap: "Ông đã nêu đủ thành phần và nối được nguyên nhân với kết quả bằng cách diễn đạt riêng.",
    nextPrompt: "Mental model này đủ rõ để chuyển sang bước tiếp theo.",
  };
}

export function gradeExplanation({ answer, input, prompt = "", hints = [], activityId = "" }) {
  const normalized = normalizeVietnamese(answer);
  const answerTokens = tokens(answer);
  const meaningful = meaningfulTokens(answer);
  const uniqueMeaningful = [...new Set(meaningful)];
  const rubric = getExplanationRubric(activityId);
  const conceptGroups = rubric?.concepts ?? input.rubricTerms.map((term) => ({ label: term, terms: [term] }));
  const rubricVocabulary = conceptGroups.flatMap((concept) => concept.terms);
  const requiredConcepts = rubric?.requiredConcepts ?? input.requiredTerms;
  const sourceTokens = new Set(meaningfulTokens(`${prompt} ${hints.join(" ")} ${rubricVocabulary.join(" ")}`));
  const hintTokens = new Set(meaningfulTokens(hints.join(" ")));
  const matchedGroups = conceptGroups.filter((concept) => concept.terms.some((term) => includesPhrase(normalized, term)));
  const concepts = matchedGroups.map((concept) => concept.label);
  const missingConcepts = conceptGroups.filter((concept) => !matchedGroups.includes(concept)).map((concept) => concept.label);
  const hasCausalLink = CAUSAL_MARKERS.some((marker) => includesPhrase(normalized, marker));
  const clauses = String(answer).split(/[.!?;:\n]+/).map((part) => normalizeVietnamese(part)).filter(Boolean);
  const linkedClause = clauses.some((clause) => {
    const termsInClause = conceptGroups.filter((concept) => concept.terms.some((term) => includesPhrase(clause, term))).length;
    const relationInClause = CAUSAL_MARKERS.some((marker) => includesPhrase(clause, marker));
    return termsInClause >= 2 && relationInClause;
  });
  const novelWords = uniqueMeaningful.filter((token) => !sourceTokens.has(token));
  const sourceDominance = meaningful.length
    ? meaningful.filter((token) => sourceTokens.has(token)).length / meaningful.length
    : 1;
  const hintDominance = meaningful.length
    ? meaningful.filter((token) => hintTokens.has(token)).length / meaningful.length
    : 1;
  const similarities = hints.map((hint) => hintSimilarity(answerTokens, tokens(hint)));
  const exactHintCopies = hints.filter((hint) => normalized.includes(normalizeVietnamese(hint))).length;
  const phraseCopy = copiedPhraseRatio(answer, hints);
  const copiedHints = exactHintCopies > 0
    || phraseCopy >= 0.34
    || (Math.max(0, ...similarities) >= 0.9 && hintDominance >= 0.62 && sourceDominance >= 0.72 && novelWords.length < 5);
  const repetitionRatio = meaningful.length ? uniqueMeaningful.length / meaningful.length : 0;
  const keywordDump = meaningful.length >= 9 && (repetitionRatio < 0.58 || (concepts.length >= requiredConcepts && !linkedClause && clauses.length <= 2));
  const enoughLength = String(answer).trim().length >= input.minLength;
  const enoughConcepts = concepts.length >= requiredConcepts;
  const hasRelation = hasCausalLink && linkedClause;
  const original = !copiedHints && !keywordDump && novelWords.length >= 4;

  const criteria = [
    { id: "mechanism", label: "Có đủ thành phần để lần theo cơ chế", passed: enoughLength && enoughConcepts },
    { id: "relation", label: "Nối được nguyên nhân với kết quả", passed: hasRelation },
    { id: "originality", label: "Dùng cấu trúc và ví dụ của riêng mình", passed: original },
  ];

  const diagnosis = exactHintCopies > 0
    ? "copied_hint"
    : keywordDump
      ? "keyword_dump"
      : copiedHints
      ? "copied_hint"
      : !enoughLength
        ? "too_short"
        : !enoughConcepts
          ? "missing_concepts"
          : !hasRelation
            ? "unlinked_concepts"
            : "passed";
  const coach = buildCoach({ diagnosis, concepts, missingConcepts, input: { ...input, rubricTerms: conceptGroups.map((concept) => concept.label) } });
  const passed = diagnosis === "passed";

  return {
    passed,
    diagnosis,
    criteria,
    concepts,
    missingConcepts,
    coach,
    repair: passed ? null : {
      reason: diagnosis,
      title: diagnosis === "copied_hint" ? "Tự dựng lại lời giải" : diagnosis === "keyword_dump" ? "Nối từ khóa thành cơ chế" : "Sửa mắt xích còn thiếu",
      prompt: coach.nextPrompt,
      focusTerms: [...new Set([...concepts.slice(0, 1), ...missingConcepts.slice(0, 2)])].slice(0, 3),
    },
    message: `${coach.acknowledgement} ${coach.gap} ${coach.nextPrompt}`,
    signals: { exactHintCopies, phraseCopy, sourceDominance, hintDominance, novelWordCount: novelWords.length },
  };
}
