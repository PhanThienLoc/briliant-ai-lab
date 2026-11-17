import assert from "node:assert/strict";
import test from "node:test";
import { buildSourceCourse, completeSourceLesson, readSourceCourses, parseSourceCourses, SOURCE_COURSES_KEY } from "../lib/source-course.ts";
import { createLearningBackup, parseLearningBackupText } from "../lib/learning-backup.ts";

const topics = ["phân phối dữ liệu", "rò rỉ nhãn", "độ lệch chọn mẫu", "đặc trưng đầu vào", "mốc so sánh", "hàm mất mát", "tập xác thực"];
const sample = topics.map((topic, i) => `Phần ${i + 1}: Mô hình học từ dữ liệu cần tập huấn luyện độc lập để nghiên cứu ${topic} và đánh giá trên tập kiểm tra chưa được xem trước. Nếu phép đo bỏ qua ${topic} thì sai số có thể lạc quan và không phản ánh khả năng tổng quát hóa. Một biến hữu ích cần được xem xét trong bối cảnh mục tiêu và giả thiết của bài toán.`).join("\n\n");

const sourceFixture = () => buildSourceCourse({ title: "Học máy", kind: "paper", text: sample, sourceName: "Bài báo A", sourceUrl: "https://example.com/paper" }, new Date("2026-10-30T00:00:00Z"));
const completedFixture = () => completeSourceLesson(sourceFixture(), "lesson-1", new Date("2026-10-30T00:00:00Z"));

test("source parser rejects missing provenance and ambiguous record identities", () => {
  const invalid = [
    (c) => { delete c.lessons[0].objective; },
    (c) => { c.lessons[0].objective = "   "; },
    (c) => { delete c.lessons[0].sourceLocation; },
    (c) => { c.lessons[0].sourceLocation = " "; },
    (c) => { c.lessons[0].id = ""; },
    (c) => { c.lessons[1].id = c.lessons[0].id; },
    (c) => { c.id = " "; },
    (c) => { c.createdAt = "invalid-date"; },
  ];
  for (const mutate of invalid) {
    const course = sourceFixture(); mutate(course);
    assert.throws(() => parseSourceCourses(JSON.stringify([course])), /không hợp lệ/, mutate.toString());
  }
  const course = sourceFixture();
  assert.throws(() => parseSourceCourses(JSON.stringify([course, structuredClone(course)])), /không hợp lệ/);
});

test("source parser rejects invalid or contradictory learning timestamps", () => {
  const invalid = [
    (l) => { l.completedAt = "invalid-date"; },
    (l) => { l.reviewDueAt = "invalid-date"; },
    (l) => { l.reviewedAt = "invalid-date"; },
    (l) => { l.reviewDueAt = null; },
    (l) => { l.completedAt = 0; },
    (l) => { delete l.completedAt; },
    (l) => { delete l.reviewDueAt; },
    (l) => { l.reviewDueAt = "2026-11-01T23:59:59.999Z"; },
    (l) => { l.reviewedAt = "2026-11-01T23:59:59.999Z"; },
  ];
  for (const mutate of invalid) {
    const course = completedFixture(); mutate(course.lessons[0]);
    assert.throws(() => parseSourceCourses(JSON.stringify([course])), /không hợp lệ/, mutate.toString());
  }
  const orphan = sourceFixture(); orphan.lessons[0].reviewedAt = "2026-11-02T00:00:00Z";
  assert.throws(() => parseSourceCourses(JSON.stringify([orphan])), /không hợp lệ/);
});

test("source completion rejects corrupt review evidence without mutating the course", () => {
  const invalid = [
    (l) => { l.reviewDueAt = "invalid-date"; },
    (l) => { delete l.completedAt; },
    (l) => { l.completedAt = "invalid-date"; },
    (l) => { l.reviewDueAt = "2026-10-30T01:00:00Z"; },
    (l) => { l.reviewedAt = "2026-10-31T00:00:00Z"; },
  ];
  for (const mutate of invalid) {
    const course = completedFixture(); mutate(course.lessons[0]);
    const before = structuredClone(course);
    assert.throws(() => completeSourceLesson(course, "lesson-1", new Date("2026-11-02T00:00:00Z"), true));
    assert.deepEqual(course, before);
  }
});

test("source review rejects one millisecond early and preserves valid evidence at the exact due time", () => {
  const course = completedFixture();
  assert.throws(() => completeSourceLesson(course, "lesson-1", new Date("2026-11-01T23:59:59.999Z"), true), /chưa đến hạn/);
  const reviewed = completeSourceLesson(course, "lesson-1", new Date("2026-11-02T00:00:00Z"), true);
  assert.deepEqual(parseSourceCourses(JSON.stringify([reviewed])), [reviewed]);
  assert.equal(reviewed.id, course.id);
  assert.equal(reviewed.lessons[0].completedAt, course.lessons[0].completedAt);
  assert.equal(reviewed.lessons[0].reviewDueAt, course.lessons[0].reviewDueAt);
  assert.equal(reviewed.lessons[0].reviewedAt, "2026-11-02T00:00:00.000Z");
});

test("replaying a completed source lesson preserves its original review schedule and evidence", () => {
  const course = completedFixture();
  const practiced = completeSourceLesson(course, "lesson-1", new Date("2026-10-31T00:00:00Z"));
  assert.deepEqual(practiced, course);
  const reviewed = completeSourceLesson(course, "lesson-1", new Date("2026-11-02T00:00:00Z"), true);
  const replayed = completeSourceLesson(reviewed, "lesson-1", new Date("2026-11-03T00:00:00Z"));
  assert.deepEqual(replayed, reviewed);
  assert.deepEqual(parseSourceCourses(JSON.stringify([replayed])), [reviewed]);
});

test("invalid source state remains untouched on read and is rejected by backup import", () => {
  const course = completedFixture(); course.lessons[0].reviewDueAt = "invalid-date";
  const saved = JSON.stringify([course]);
  const writes = [];
  const storage = { getItem: () => saved, setItem: (...args) => writes.push(args), removeItem: (...args) => writes.push(args) };
  const result = readSourceCourses(() => storage);
  assert.equal(result.courses, null);
  assert.ok(result.error);
  assert.equal(storage.getItem(), saved);
  assert.deepEqual(writes, []);
  assert.throws(() => parseLearningBackupText(JSON.stringify({ product: "BriliantAI Lab", schemaVersion: 1, exportedAt: "2026-11-02T00:00:00Z", data: { [SOURCE_COURSES_KEY]: saved } })), /nguồn.*không hợp lệ/);
});

test("source course keeps traceable excerpts and varied answer positions", () => {
  const course = buildSourceCourse({ title: "Học máy", kind: "paper", text: sample, sourceName: "Bài báo A" }, new Date("2026-10-30T00:00:00Z"));
  assert.ok(course.lessons.length >= 2);
  assert.ok(course.lessons.every((lesson) => lesson.excerpt.includes("tập huấn luyện") && lesson.sourceLocation.includes("Bài báo A")));
  assert.ok(new Set(course.lessons.map((lesson) => lesson.answer)).size > 1);
  assert.ok(course.lessons.every((lesson) => lesson.options[lesson.answer].includes("Mô hình")));
  assert.ok(course.lessons.every((lesson) => lesson.reviewOptions[lesson.reviewAnswer] !== lesson.options[lesson.answer]));
});

test("book PDF samples chapter prose across pages, never quizzing the front matter", () => {
  const pages = Array.from({ length: 12 }, (_, index) => {
    const page = index + 1;
    if (page < 4) return `Trang ${page}\nContents and acknowledgments appear before the lessons. Chapter 1 is listed in the contents but this is not the actual chapter. This page contains contributor names and front matter rather than a learning passage.`;
    const heading = page === 4 ? "Chapter 1 The way of the program. " : "";
    return `Trang ${page}\n${heading}A program on page ${page} follows a sequence of instructions to transform input into a result. The example on page ${page} shows how one decision changes the output when the input changes. A learner can test the explanation by tracing each instruction with another input.`;
  }).join("\n\n");
  const course = buildSourceCourse({ title: "Think Python", kind: "book", text: pages, sourceName: "thinkpython.pdf" });
  assert.equal(course.lessons.length, 6);
  assert.match(course.lessons[0].sourceLocation, /Trang 4/);
  assert.match(course.lessons.at(-1).sourceLocation, /Trang 12/);
  assert.ok(course.lessons.every((lesson) => !lesson.excerpt.includes("Contents and acknowledgments") && !lesson.title.startsWith("Trang ")));
  assert.ok(course.lessons.every((lesson) => lesson.excerpt.includes(lesson.options[lesson.answer]) && lesson.excerpt.includes(lesson.reviewOptions[lesson.reviewAnswer])));
});

test("source review opens 72 hours after lesson completion", () => {
  const course = buildSourceCourse({ title: "", kind: "book", text: sample, sourceName: "Sách A" });
  const done = completeSourceLesson(course, "lesson-1", new Date("2026-10-30T00:00:00Z"));
  assert.equal(done.lessons[0].reviewDueAt, "2026-11-02T00:00:00.000Z");
  assert.equal(course.lessons[0].completedAt, undefined);
  assert.throws(() => completeSourceLesson(done, "lesson-1", new Date("2026-10-31T00:00:00Z"), true), /chưa đến hạn/);
  const reviewed = completeSourceLesson(done, "lesson-1", new Date("2026-11-02T00:00:00Z"), true);
  assert.equal(reviewed.lessons[0].reviewedAt, "2026-11-02T00:00:00.000Z");
});

test("malformed local course state reports a read error without an empty success", () => {
  const result = readSourceCourses(() => ({ getItem: () => "bad json" }));
  assert.equal(result.courses, null);
  assert.ok(result.error);
  assert.equal(SOURCE_COURSES_KEY, "briliantai.source-courses.v1");
  assert.throws(() => buildSourceCourse({ title: "A", kind: "video", text: "too short", sourceName: "B" }), /400 ký tự/);
});

test("source courses are portable with Learning Passport and malformed choices are rejected", () => {
  const course = buildSourceCourse({ title: "Học máy", kind: "paper", text: sample, sourceName: "Bài báo A" });
  const value = JSON.stringify([course]);
  const storage = { length: 1, key: () => SOURCE_COURSES_KEY, getItem: () => value };
  const backup = createLearningBackup(storage, "2026-10-30T00:00:00Z");
  assert.equal(parseLearningBackupText(JSON.stringify(backup)).data[SOURCE_COURSES_KEY], value);
  course.lessons[0].answer = 99;
  assert.throws(() => parseSourceCourses(JSON.stringify([course])), /không hợp lệ/);
  assert.throws(() => parseLearningBackupText(JSON.stringify({ ...backup, data: { [SOURCE_COURSES_KEY]: JSON.stringify([course]) } })), /không hợp lệ/);
});


test("source review catches a denied storage property getter without writing", () => {
  let accesses = 0;
  const host = { get localStorage() { accesses++; throw new DOMException("blocked", "SecurityError"); } };
  const result = readSourceCourses(() => host.localStorage);
  assert.equal(accesses, 1);
  assert.equal(result.courses, null);
  assert.ok(result.error);
});

test("source review reports a denied read and never writes or removes saved state", () => {
  const reads = [], mutations = [];
  const storage = {
    getItem(key) { reads.push(key); throw new DOMException("blocked", "SecurityError"); },
    setItem() { mutations.push("write"); },
    removeItem() { mutations.push("delete"); },
    clear() { mutations.push("clear"); },
  };
  const result = readSourceCourses(() => storage);
  assert.deepEqual(reads, [SOURCE_COURSES_KEY]);
  assert.deepEqual(mutations, []);
  assert.equal(result.courses, null);
  assert.ok(result.error);
});

test("source review leaves malformed bytes intact and can recover on retry", () => {
  let saved = "{bad json";
  const reads = [], mutations = [];
  const storage = {
    getItem(key) { reads.push(key); return saved; },
    setItem() { mutations.push("write"); },
    removeItem() { mutations.push("delete"); },
    clear() { mutations.push("clear"); },
  };
  const failed = readSourceCourses(() => storage);
  assert.equal(failed.courses, null);
  assert.ok(failed.error);
  assert.equal(saved, "{bad json");
  const course = completeSourceLesson(buildSourceCourse({ title: "Học máy", kind: "paper", text: sample, sourceName: "Bài báo A", sourceUrl: "https://example.com/source" }), "lesson-1", new Date("2026-10-30T00:00:00Z"));
  saved = JSON.stringify([course]);
  const recovered = readSourceCourses(() => storage);
  assert.equal(recovered.error, null);
  assert.deepEqual(recovered.courses, [course]);
  assert.equal(recovered.courses[0].lessons[0].reviewDueAt, "2026-11-02T00:00:00.000Z");
  assert.equal(saved, JSON.stringify([course]));
  assert.deepEqual(reads, [SOURCE_COURSES_KEY, SOURCE_COURSES_KEY]);
  assert.deepEqual(mutations, []);
});

test("source review distinguishes a missing saved library from failed storage", () => {
  assert.deepEqual(readSourceCourses(() => ({ getItem: () => null })), { courses: [], error: null });
});

test('source parser and backup import reject unsupported correct answers and duplicate choices', () => {
 const mutations = [
  l => { l.options[l.answer]='Unsupported learning claim that the supplied excerpt never states.'; },
  l => { l.reviewOptions[l.reviewAnswer]='Another unsupported claim absent from this passage.'; },
  l => { l.options[(l.answer+1)%l.options.length]=l.options[l.answer]; },
  l => { l.reviewOptions[(l.reviewAnswer+1)%l.reviewOptions.length]=`  ${l.reviewOptions[l.reviewAnswer].toUpperCase()}  `; },
 ];
 for(const mutate of mutations) {
  const course=sourceFixture(); mutate(course.lessons[0]);
  const saved=JSON.stringify([course]);
  assert.throws(()=>parseSourceCourses(saved),/dẫn chứng|trùng|không hợp lệ/);
  assert.throws(()=>parseLearningBackupText(JSON.stringify({product:'BriliantAI Lab',schemaVersion:1,exportedAt:'2026-11-02T00:00:00Z',data:{[SOURCE_COURSES_KEY]:saved}})),/không hợp lệ/);
 }
});

test('source parser rejects a competing answer also quoted in the excerpt', () => {
 const course=sourceFixture(); const l=course.lessons[0];
 l.options[(l.answer+1)%l.options.length]=l.reviewOptions[l.reviewAnswer];
 assert.throws(()=>parseSourceCourses(JSON.stringify([course])),/không hợp lệ|chồng lặp/);
});
