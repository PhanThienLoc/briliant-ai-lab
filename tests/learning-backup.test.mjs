import assert from "node:assert/strict";
import test from "node:test";
import { createLearningBackup, parseLearningBackupText, restoreLearningBackup, summarizeLearningBackup } from "../lib/learning-backup.ts";
import { ADAPTIVE_STATE_KEY, createLocalStorageLearningRepository } from "../lib/learning-repository.ts";
import { SOURCE_DRAFTS_KEY } from "../lib/source-draft-store.ts";
import { buildSourceCourse, SOURCE_COURSES_KEY } from "../lib/source-course.ts";
import { lessonCatalog } from "../lib/lesson-catalog.ts";

class MemoryStorage {
  constructor(entries = {}, failOnceOn = null) {
    this.values = new Map(Object.entries(entries));
    this.failOnceOn = failOnceOn;
  }
  get length() { return this.values.size; }
  key(index) { return [...this.values.keys()][index] ?? null; }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) {
    if (this.failOnceOn === key) {
      this.failOnceOn = null;
      throw new Error("quota");
    }
    this.values.set(key, String(value));
  }
  removeItem(key) { this.values.delete(key); }
}

function lessonBackup(progress, version = 3, lessonId = "vectors") {
  return JSON.stringify({
    product: "BriliantAI Lab", schemaVersion: 1, exportedAt: "2026-08-28T00:00:00.000Z",
    data: { [`briliantai.lesson.${lessonId}.progress.v${version}`]: JSON.stringify(progress) },
  });
}

for (const currentIndex of [0.5, "1", -1, null, 5]) {
  test(`lesson import rejects invalid activity index ${JSON.stringify(currentIndex)}`, () => {
    assert.throws(() => parseLearningBackupText(lessonBackup({ currentIndex })), /tiến độ bài học không hợp lệ/i);
  });
}

for (const progress of [[], null, { completed: {} }, { completed: [null] }, { attempts: [] }, { hintLevels: "bad" }, { activityEvidence: [] }, { activityEvidence: { a: null } }, { practicedAt: "bad-date" }, { review: [] }, { review: { dueAt: "bad-date" } }]) {
  test(`lesson import rejects malformed consumer fields ${JSON.stringify(progress)}`, () => {
    assert.throws(() => parseLearningBackupText(lessonBackup(progress)), /tiến độ bài học không hợp lệ/i);
  });
}

test("lesson import preserves minimal, v2 and v3 backup bytes and evidence", () => {
  const timestamp = "2026-08-28T00:00:00.000Z";
  const fixtures = [{}, { completed: ["vectors-predict"] }, {
    currentIndex: 4, completed: ["vectors-predict"], attempts: { "vectors-predict": 2 }, hintLevels: { "vectors-predict": 1 },
    activityEvidence: { "vectors-predict": { completedAt: timestamp, independentAt: timestamp, attempts: 2, hintsUsed: 1 } },
    practicedAt: timestamp, review: { dueAt: "2026-08-31T00:00:00.000Z", completedAt: null, attempts: 0, correct: false },
  }];
  for (const version of [2, 3]) for (const progress of fixtures) {
    const text = lessonBackup(progress, version);
    const backup = parseLearningBackupText(text);
    const storage = new MemoryStorage();
    restoreLearningBackup(backup, storage);
    assert.equal(storage.getItem(`briliantai.lesson.vectors.progress.v${version}`), JSON.parse(text).data[`briliantai.lesson.vectors.progress.v${version}`]);
  }
  for (const lesson of lessonCatalog.lessons) {
    assert.doesNotThrow(() => parseLearningBackupText(lessonBackup({ currentIndex: lesson.activities.length - 1 }, 3, lesson.id)));
    assert.throws(() => parseLearningBackupText(lessonBackup({ currentIndex: lesson.activities.length }, 3, lesson.id)));
  }
  assert.doesNotThrow(() => parseLearningBackupText(lessonBackup({ currentIndex: 7 }, 3, "future-lesson")));
});

test("rejected lesson import keeps all previous storage bytes", () => {
  const storage = new MemoryStorage({ "briliantai.lesson.vectors.progress.v3": "  {\"completed\":[]}  ", "unrelated.preference": "keep" });
  const before = [...storage.values];
  assert.throws(() => restoreLearningBackup(parseLearningBackupText(lessonBackup({ currentIndex: 0.5 })), storage));
  assert.deepEqual([...storage.values], before);
});

test("learning passport exports only allowlisted BriliantAI state", () => {
  const storage = new MemoryStorage({
    [ADAPTIVE_STATE_KEY]: JSON.stringify({ schemaVersion: 1, sessionMinutes: 25, lastGeneratedAt: null, lastQueueIds: ["vectors:vec-explain"] }),
    "briliantai.lesson.vectors.progress.v3": JSON.stringify({ completed: ["vectors-predict"] }),
    "briliantai.diagnostic.v1": JSON.stringify({ answers: {} }),
    "briliantai.expansion-progress.v3": JSON.stringify({ completedLabIds: ["logic-truth-table", "sql-select"], passedEdgeIds: ["logic-to-conditional"] }),
    "briliantai.repair-queue.v1": JSON.stringify([{ id: "vectors:vec-explain" }]),
    "unrelated.preference": JSON.stringify({ theme: "dark" }),
  });
  const backup = createLearningBackup(storage, "2026-08-28T00:00:00.000Z");
  const summary = summarizeLearningBackup(backup);

  assert.deepEqual(Object.keys(backup.data), [
    "briliantai.adaptive-state.v1",
    "briliantai.diagnostic.v1",
    "briliantai.expansion-progress.v3",
    "briliantai.lesson.vectors.progress.v3",
    "briliantai.repair-queue.v1",
  ]);
  assert.equal(summary.itemCount, 5);
  assert.equal(summary.lessonCount, 1);
  assert.equal(summary.expansionLabCount, 2);
  assert.equal(summary.hasDiagnostic, true);
  assert.equal(summary.hasAdaptiveState, true);
  assert.equal(summary.hasRepairQueue, true);
});

test("learning passport rejects unknown keys and corrupt state", () => {
  const validHeader = { product: "BriliantAI Lab", schemaVersion: 1, exportedAt: "2026-08-28T00:00:00.000Z" };
  assert.throws(() => parseLearningBackupText(JSON.stringify({ ...validHeader, data: { "other.app": "{}" } })), /không được phép/);
  assert.throws(() => parseLearningBackupText(JSON.stringify({ ...validHeader, data: { "briliantai.diagnostic.v1": "not-json" } })), /bị hỏng/);
  assert.throws(() => parseLearningBackupText(JSON.stringify({
    ...validHeader,
    data: { [ADAPTIVE_STATE_KEY]: JSON.stringify({ schemaVersion: 2 }) },
  })), /adaptive state không hợp lệ/i);
  assert.throws(() => parseLearningBackupText(JSON.stringify({
    ...validHeader,
    data: { [ADAPTIVE_STATE_KEY]: JSON.stringify({ schemaVersion: 1, sessionMinutes: 30, lastGeneratedAt: null, lastQueueIds: [], privateNotes: "must not restore" }) },
  })), /adaptive state không hợp lệ/i);
  assert.throws(() => parseLearningBackupText(JSON.stringify({
    ...validHeader,
    data: { [ADAPTIVE_STATE_KEY]: JSON.stringify({ schemaVersion: 1, sessionMinutes: "30", lastGeneratedAt: null, lastQueueIds: [] }) },
  })), /adaptive state không hợp lệ/i);
});

test("learning passport normalizes valid adaptive preferences before restore", () => {
  const backup = parseLearningBackupText(JSON.stringify({
    product: "BriliantAI Lab",
    schemaVersion: 1,
    exportedAt: "2026-08-28T00:00:00.000Z",
    data: {
      [ADAPTIVE_STATE_KEY]: JSON.stringify({
        schemaVersion: 1,
        sessionMinutes: 26.5,
        lastGeneratedAt: "2026-08-28T00:00:00.000Z",
        lastQueueIds: ["a", "a", "b", "c", "d", "e"],
      }),
    },
  }));

  assert.deepEqual(JSON.parse(backup.data[ADAPTIVE_STATE_KEY]), {
    schemaVersion: 1,
    sessionMinutes: 27,
    lastGeneratedAt: "2026-08-28T00:00:00.000Z",
    lastQueueIds: ["a", "b", "c", "d"],
  });
});

test("failed restore rolls back every value already written", () => {
  const lessonKey = "briliantai.lesson.vectors.progress.v3";
  const diagnosticKey = "briliantai.diagnostic.v1";
  const previousAdaptive = JSON.stringify({ schemaVersion: 1, sessionMinutes: 45, lastGeneratedAt: null, lastQueueIds: ["old"] });
  const storage = new MemoryStorage({
    [ADAPTIVE_STATE_KEY]: previousAdaptive,
    [lessonKey]: JSON.stringify({ old: true }),
  }, diagnosticKey);
  const backup = parseLearningBackupText(JSON.stringify({
    product: "BriliantAI Lab",
    schemaVersion: 1,
    exportedAt: "2026-08-28T00:00:00.000Z",
    data: {
      [ADAPTIVE_STATE_KEY]: JSON.stringify({ schemaVersion: 1, sessionMinutes: 20, lastGeneratedAt: null, lastQueueIds: ["new"] }),
      [lessonKey]: JSON.stringify({ new: true }),
      [diagnosticKey]: JSON.stringify({ answers: {} }),
    },
  }));

  assert.throws(() => restoreLearningBackup(backup, storage), /dữ liệu cũ đã được giữ lại/);
  assert.equal(storage.getItem(ADAPTIVE_STATE_KEY), previousAdaptive);
  assert.equal(storage.getItem(lessonKey), JSON.stringify({ old: true }));
  assert.equal(storage.getItem(diagnosticKey), null);
});

test("restored backup completion IDs cannot inflate runtime progress", async () => {
  for (const version of [2, 3]) {
    const raw = { completed: [...Array(10).fill("vec-predict"), "foreign"] };
    const backup = parseLearningBackupText(lessonBackup(raw, version));
    const storage = new MemoryStorage();
    restoreLearningBackup(backup, storage);
    const snapshot = await createLocalStorageLearningRepository(storage).readSnapshot();
    assert.deepEqual(snapshot.lessons.vectors.completed, ["vec-predict"]);
    assert.equal(snapshot.lessons.vectors.practicedAt, null);
    assert.equal(storage.getItem(`briliantai.lesson.vectors.progress.v${version}`), JSON.stringify(raw));
  }
});

test("v1 expansion-only passport counts unique labs and newer keys take precedence", () => {
  const v1 = { "briliantai.expansion-progress.v1": JSON.stringify({ completedLabIds: ["sql-select", "sql-select", "logic-truth-table"] }) };
  const backup = createLearningBackup(new MemoryStorage(v1));
  assert.equal(summarizeLearningBackup(backup).expansionLabCount, 2);
  for (const version of [2, 3]) {
    const newer = createLearningBackup(new MemoryStorage({ ...v1, [`briliantai.expansion-progress.v${version}`]: JSON.stringify({ completedLabIds: [] }) }));
    assert.equal(summarizeLearningBackup(newer).expansionLabCount, 0);
  }
});


function coverageFixture() {
  return {
    version: 2, id: "coverage-1", title: "Bản nháp độ phủ", kind: "article",
    document: {
      id: "doc-1", name: "Tài liệu nguồn",
      sections: Array.from({ length: 12 }, (_, index) => ({
        id: `section-${index + 1}`, text: `Mục nguồn ${index + 1}. Đây là nội dung giữ nguyên để kiểm tra bản sao lưu.`,
        locator: { kind: "section", path: ["Tài liệu"], ordinal: index + 1 },
      })),
    },
    selectedSectionIds: ["section-2", "section-7"],
    coverage: { selectedUnits: 12, processedUnits: 12, emptyUnits: [], truncated: false, lastProcessedUnit: 12 },
    updatedAt: "2026-11-19T00:00:00Z",
  };
}

function savedSourceCourse() {
  const paragraph = "Tập huấn luyện được dùng để tìm tham số của mô hình bằng những ví dụ đã có nhãn. Tập xác thực giúp chọn mô hình mà không sử dụng dữ liệu kiểm tra. Tập kiểm tra chỉ được sử dụng khi mọi quyết định đã được hoàn tất.";
  return buildSourceCourse({
    title: "Khóa cũ", kind: "article", sourceName: "Nguồn cũ",
    text: `${paragraph}

Một bước chuẩn hóa phải được học từ tập huấn luyện để tránh rò rỉ thông tin. Khi đánh giá mô hình cần giữ nguyên cấu hình đã được chọn từ trước. Việc đưa thống kê của tập kiểm tra vào quá trình chuẩn hóa có thể gây kết quả đánh giá lạc quan.`,
  }, new Date("2026-11-18T00:00:00Z"));
}

test("coverage drafts round-trip in Passport without changing source courses", () => {
  const draftBytes = JSON.stringify([coverageFixture()]);
  const courseBytes = JSON.stringify([savedSourceCourse()]);
  const source = new MemoryStorage({ [SOURCE_DRAFTS_KEY]: draftBytes, [SOURCE_COURSES_KEY]: courseBytes });
  const backup = parseLearningBackupText(JSON.stringify(createLearningBackup(source)));
  const target = new MemoryStorage();
  restoreLearningBackup(backup, target);
  assert.equal(target.getItem(SOURCE_DRAFTS_KEY), draftBytes);
  assert.equal(target.getItem(SOURCE_COURSES_KEY), courseBytes);
  assert.equal(JSON.parse(target.getItem(SOURCE_DRAFTS_KEY))[0].document.sections.length, 12);
});

test("invalid coverage draft in Passport is rejected before old drafts or courses change", () => {
  const original = { [SOURCE_DRAFTS_KEY]: JSON.stringify([coverageFixture()]), [SOURCE_COURSES_KEY]: JSON.stringify([savedSourceCourse()]) };
  const storage = new MemoryStorage(original);
  const invalid = coverageFixture(); invalid.selectedSectionIds.push("unknown-section");
  const backup = createLearningBackup(new MemoryStorage({ ...original, [SOURCE_DRAFTS_KEY]: JSON.stringify([invalid]) }));
  assert.throws(() => restoreLearningBackup(parseLearningBackupText(JSON.stringify(backup)), storage));
  assert.deepEqual(Object.fromEntries(storage.values), original);
});

test("failed coverage restore rolls back courses and prior draft bytes", () => {
  const original = { [SOURCE_DRAFTS_KEY]: JSON.stringify([coverageFixture()]), [SOURCE_COURSES_KEY]: JSON.stringify([savedSourceCourse()]) };
  const changed = coverageFixture(); changed.title = "Bản mới";
  const oldCourse = savedSourceCourse(); const newCourse = { ...oldCourse, title: "Khóa mới" };
  const backup = parseLearningBackupText(JSON.stringify(createLearningBackup(new MemoryStorage({
    [SOURCE_COURSES_KEY]: JSON.stringify([newCourse]),
    [SOURCE_DRAFTS_KEY]: JSON.stringify([changed]),
  }))));
  const storage = new MemoryStorage(original, SOURCE_DRAFTS_KEY);
  assert.throws(() => restoreLearningBackup(backup, storage), /dữ liệu cũ đã được giữ lại/);
  assert.deepEqual(Object.fromEntries(storage.values), original);
});
