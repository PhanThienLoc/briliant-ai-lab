# Source foundation implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make source validation, provenance and coverage reliable before implementing AI course generation.

**Architecture:** Preserve the v1 course runtime. Introduce an independent normalized document and v2 coverage draft, with a lossless adapter for selected 2–6-section practice courses. Extract PDF/file reading behind a testable module; no backend or model call in this milestone.

**Tech Stack:** Existing React 19, TypeScript, Node test runner, pdfjs-dist and browser storage; no new runtime dependency.

**Spec:** `docs/superpowers/specs/2026-11-16-source-pipeline-design.md`

## Global constraints

- Keep `briliantai.source-courses.v1`, existing IDs and original saved bytes on read failure.
- Review requires completedAt and reviewDueAt >= completedAt + 72 hours; reviewedAt cannot precede reviewDueAt.
- Retain current limits: 30 MiB PDF; 15 MiB text; 60 selected PDF pages; 120,000 source characters per batch.
- Introduce separate local draft storage `briliantai.source-drafts.v2`, at most 10 drafts, at most 200 sections per draft, at most 4,000 characters per section.
- Preserve the Stitch visual system, keyboard flow and 44px targets. No global UI rewrite.

## Review focus

1. Invalid dates or orphaned review evidence must never grant review completion — Task 1.
2. A mostly scanned or truncated PDF must not appear fully imported — Tasks 2 and 4.
3. Repeated headings, duplicate text and transcript cue overlap must keep distinct locations — Task 3.
4. Quota/permission errors must preserve the last valid saved state — Task 4.
5. Existing completed v1 courses must retain IDs, evidence and review timing after draft work — Tasks 1 and 4.

## Task 1 — Close persisted-course validation gaps

**Files:** modify `lib/source-course.ts`; test `tests/source-course.test.mjs`, `tests/source-draft.test.mjs`.

**Interfaces:** retain `parseSourceCourses(text: string): SourceCourse[]`, `readSourceCourses(getStorage): SourceCoursesReadResult` and `completeSourceLesson(course, lessonId, now?, review?)` signatures.

- [x] Add failing tests: invalid dates, missing objective/locator, duplicate IDs, review evidence without completion, reviewDueAt earlier than completion +72h, reviewedAt before due date. Parser rejects each; review completion throws without mutation. Valid legacy fixtures retain IDs and timestamps.
- [x] Run `node --test tests/source-course.test.mjs tests/source-draft.test.mjs`; record the intended failures before implementing.
- [x] Validate required fields and timestamp invariants in `parseSourceCourses`; check finite dates and completion prerequisite again at the review mutation boundary. Retain the existing storage error union and read-only recovery behavior.
- [x] Run the same tests; require all pass, including exact 72-hour boundary and denied-storage cases.
- [x] Commit `fix: validate source course evidence and review dates`.

## Task 2 — Extract bounded file ingestion with coverage metadata

**Files:** create `lib/source-ingest.ts`; modify `app/source-studio.tsx`; test `tests/source-ingest.test.mjs`; reuse `lib/pdf-page-range.ts`.

**Interfaces:** define `SourceBlock = { ordinal: number; text: string; locator: { kind: 'page'; first: number; last: number } | { kind: 'time'; startMs: number; endMs: number } | { kind: 'section'; path: string[]; ordinal: number } }`. Define `IngestResult = { blocks: SourceBlock[]; selectedUnits: number; processedUnits: number; emptyUnits: number[]; truncated: boolean; lastProcessedUnit: number }`. Export `readSourceFile(file: File, range: { first: string; last: string }): Promise<IngestResult>`.

- [ ] Add failing tests using a small actual PDF fixture: page 2 empty, page 3 text; physical page locators remain 1 and 3, emptyUnits includes 2. A text-heavy page exhausting the 120,000-character budget returns truncated=true, never a silent slice. A fully image-only file returns an OCR-needed error.
- [ ] Run `node --test tests/source-ingest.test.mjs`; confirm the missing module/API fails.
- [ ] Move the component's file reader into the module, retain PDF cleanup in finally, enforce existing limits and expose explicit truncation. Add a narrow PDF-loader injection seam for cleanup/rejection tests; actual-fixture tests use pdfjs-dist.
- [ ] Require rejection/cleanup tests for corrupt/encrypted PDF, oversized file and invalid range; successful fixture extraction must match physical page labels.
- [ ] Commit `refactor: expose source ingestion coverage`.

## Task 3 — Represent every selected section in a coverage draft

**Files:** create `lib/source-document.ts`; test `tests/source-document.test.mjs`; keep the existing sampled builder available.

**Interfaces:** consume `SourceBlock`/`IngestResult` from Task 2. Export `buildSourceDocument(input: { id: string; name: string; blocks: SourceBlock[] }): SourceDocument` and `validateEvidence(document: SourceDocument, ref: EvidenceRef): boolean`. Define `SourceDocument = { id: string; name: string; sections: { id: string; text: string; locator: SourceBlock['locator'] }[] }`; `EvidenceRef = { sectionId: string; quote: string }`.

- [ ] Add failing tests: 12 distinct source sections produce 12 coverage sections, repeated headings retain separate IDs, IDs remain deterministic for identical document input, and a changed negation or numeric value fails exact quote validation.
- [ ] Run `node --test tests/source-document.test.mjs`; record intended failure.
- [ ] Implement deterministic section IDs from document ID + ordinal; split blocks longer than 4,000 characters at sentence boundaries without losing text or locator. Reject more than 200 resulting sections with a request to choose a smaller range. Never call the six-section sampling helper here.
- [ ] Test SRT/VTT overlap normalization retaining cue time ranges, Vietnamese diacritics, mathematical symbols and repeated passages. Whitespace normalization is permitted; semantic rewriting is not.
- [ ] Commit `feat: add traceable source coverage documents`.

## Task 4 — Review and resume coverage drafts in Create Course

**Files:** create `lib/source-draft-store.ts`, `components/learning/source-coverage.tsx`; modify `app/source-studio.tsx`; test `tests/source-draft-store.test.mjs`, `tests/source-draft.test.mjs`.

**Interfaces:** `CoverageDraft = { version: 2; id: string; document: SourceDocument; selectedSectionIds: string[]; coverage: Omit<IngestResult, 'blocks'>; updatedAt: string }`. Export `readCoverageDrafts(getStorage: () => Pick<Storage, 'getItem'>): { drafts: CoverageDraft[] | null; error: string | null }`, `saveCoverageDraft(storage: Pick<Storage, 'getItem' | 'setItem'>, draft: CoverageDraft): void`, and `toPracticeCourse(draft: CoverageDraft): SourceCourse`. Success returns a non-null drafts array and null error; failure returns null drafts and a nonempty error.

- [ ] Add failing tests: draft round-trip preserves all 12 sections, quota/permission failure leaves previous bytes intact, stale or duplicate selected IDs reject, and a v1 course with completion/review timestamps is unchanged after any v2 save.
- [ ] Run `node --test tests/source-draft-store.test.mjs tests/source-draft.test.mjs`; record failures.
- [ ] Save drafts under the new v2 key only; validate the complete serialized candidate before setItem, cap 10 drafts and surface write errors. `toPracticeCourse` accepts 2–6 selected valid sections in source order and reuses the current evidence checks. Larger selection stays a coverage draft and explains that full-course generation is not available yet.
- [ ] Add coverage UI: selected/processed/empty unit counts, explicit truncation, locators and resume action. No publication on import; save requires an explicit action. Preserve focused heading and keyboard navigation.
- [ ] Verify paste-text flow, PDF fixture flow, save/reload/resume, denied storage and a 390px viewport; require no document overflow, keyboard-accessible sections and 44px controls.
- [ ] Run `npm test` and `npm run lint`; require build and complete regressions pass. Review each task against spec and code quality before moving to the next. Commit `feat: review and resume source coverage drafts`.

## Subsequent plans, deliberately separate

- Milestone B: source-grounded generation service and one-chapter teaching pilot. Resolve provider/budget/upload consent first; then specify jobs, output schemas, grounding checks, answer quality and human review. Structured JSON alone is not proof of correctness.
- Milestone C: resumable whole-book batches, URL fetching, transcript retrieval and OCR, each delivered and tested independently.

## Release gate

- [ ] All new boundary tests pass; no unsupported or early review completion.
- [ ] Existing v1 backup, Library, R0–R4, SQL/Python and delayed-review regressions pass.
- [ ] Source excerpts resolve; selected range and exclusions are visible.
- [ ] Final independent review and production build pass; package and deploy only the reviewed runtime milestone.

This document is a proposed implementation plan. The present checkpoint performs audit/testing and saves documentation; its checkboxes are not claims of implemented features.
