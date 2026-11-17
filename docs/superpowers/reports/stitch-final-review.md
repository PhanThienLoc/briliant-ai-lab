# Final integrated branch review — Stitch migration

## Scope and evidence

- Base: `d75b434ecabc808f418fd5244d0de10010add65c`.
- Reviewed head: `cc44a693f26a5ac50d996d39166d926a1c5e2730`; runtime implementation is unchanged from restored `b28fd6e556333b4470a985a12e13129f8350950a`.
- Read the supplied immutable full package in bounded slices, the approved spec/plan, ledger and verification/checkpoint reports. Recovered the small ranges obscured by tool-output truncation by reading the corresponding source. Inspected unchanged callers only for specific risks: source parser/read failure semantics, expansion prerequisite/due gating and hydration, and adaptive hydration fallback.
- Fresh controller verification is accepted: production build and 150/150 tests pass; lint exits 0. Independently inspected the final test summary and lint log. No suite, build, lint, TypeScript or browser rerun was performed.
- One small read-only Node probe confirmed the existing source read helper returns `[]` for malformed JSON and denied `getItem`, while a throwing `localStorage` property getter escapes it. This was a targeted check of finding I1, not a suite rerun.
- No source/index/HEAD/branch mutation. This report is the only review output written.

## Strengths

- The five experiences share real catalog and saved records. Library search handles Vietnamese accents and Đ/đ; progress counts completed lessons, and the new pure-helper tests check concrete results, intersections, ordering and immutability (`lib/course-library.ts:3–14`, `tests/course-library.test.mjs:11–39`). No illustrative course progress, fake profile, tutor endpoint, new dependency or model integration was introduced.
- SourceStudio has sound commit ordering: hydration catches denied/malformed storage, failed writes retain prior courses/draft, exact missing targets produce a message instead of falling back, and Library/Create share one state owner (`app/source-studio.tsx:70–138`). Draft title/objective edits preserve source excerpts, IDs and answers; explicit saving still requires at least two lessons.
- Workspace moves the existing ConceptInstrument once, retains the existing grader/evidence/repair/retry callbacks, and uses real native disclosure panels. Activity-transition focus is tied to a changing context, so ordinary sliders/hints do not repeatedly steal focus (`app/learning-dashboard.tsx:945–1057`). Source-reader heading focus addresses the carried keyboard-context issue.
- Approved palette, 220px global sidebar, four mobile primary destinations, current-page semantics and skip link are implemented. Removed brutalist layers are replaced with explicit child foregrounds where parent surfaces changed; the known gradient/dense/RAW TEXT issues are fixed (`app/stitch-theme.css:2–149`). The retained `.app-shell button` and range rules establish the 44px floor despite lower-specificity legacy class rules.
- R0 due items pass review mode explicitly; source routes preserve course/lesson IDs; expansion routes preserve edge identity and existing prerequisite/review gates. No storage keys/schema, catalog content, grader implementation or dependency manifest changed. The historical Task3 checkpoint clearly distinguishes preserved history from fresh verification.
- Existing learning assertions remain. Calculated contrast tests and pure-library tests provide useful checks; source-regex tests are limited contract checks and are not being mistaken for interaction or full CSS-cascade verification. No new cosmetic declaration-mirroring tests are needed for this review.

## Issues

### Critical (Must Fix)

None found.

### Important (Should Fix)

#### I1 — Source Review hides storage failures as an empty queue or remains loading

- **Location:** `app/learning-dashboard.tsx:363–372` (especially line 364); related unchanged helper `lib/source-course.ts:148–152`.
- **Problem:** SourceReviews passes `window.localStorage` into `readSourceCourses` without a guard or error state. That helper deliberately catches malformed JSON and denied reads and returns `[]`, so Review says “Chưa có bài ôn từ nguồn” and reports zero due items even though the library could not be read. A browser that throws while accessing the localStorage property throws before the helper runs, leaving `courses === null` and the loading message indefinitely. The adaptive warning is rendered on Home, not in this Review branch.
- **Impact:** The new primary Review experience can falsely tell a learner there is no work due, or never finish loading, precisely in the denied/malformed-storage scenarios the migration handles correctly in Library/Create. This conflicts with the acceptance requirement for honest error/empty states across all five experiences.
- **Fix:** Give SourceReviews an explicit read-error state; access the storage property and call `parseSourceCourses` within the same try/catch, or reuse a result-returning safe loader. On failure show a recoverable warning, suppress the zero/empty success state, and preserve existing data. Cover denied getter/read and malformed JSON behavior with a focused behavioral check rather than a text-only assertion.

#### I2 — Instructional body copy still resolves to 14px

- **Location:** `app/globals.css:451,455–459,482,671–672,999–1005,1038–1040`; final prose overrides `app/stitch-theme.css:146–149`.
- **Problem:** The body16 declaration does not override explicit descendants. Actual answer feedback (`.runtime-feedback p`), explanation-coach gap/next-prompt paragraphs, completion explanation, Code Coach algorithm lists and SQL/lab challenge/feedback prose retain explicit 14px rules. The final theme lifts the named mental-block/activity/hint paragraphs, but does not lift these instructional sentences. The long `.app-shell :is(...)` metadata rule also includes prose such as Code Coach lists and SQL challenge text, so a plain lower-specificity paragraph rule will not fix all of them.
- **Impact:** Central teaching and correction text remains below the approved 16px body size, including text a learner must read to recover from an incorrect answer. These are body instructions, not 14px labels/metadata.
- **Fix:** Add appropriately specific final-theme 16px overrides for these actual instructional body blocks, retaining 14px for labels and numeric/code traces. Verify representative computed styles in incorrect/correct feedback, Code Coach and SQL states; do not add cosmetic CSS-declaration mirrors.

### Minor (Nice to Have)

#### M1 — Secondary Tracks and recent-history entry can reuse a previous return origin

- **Location:** `app/learning-dashboard.tsx:1309,1313–1326,1354`.
- **Problem:** Only `openExpansionItem` updates `expansionReturnView`. Direct `openView("tracks")` from secondary navigation and the expansion branch of `openLearningItem` do not. Reproduction by event sequence: Library → any expansion lab → Back → Home → secondary Tracks → Back returns to Library, because that origin survives from the earlier visit. A previous Review entry similarly leaves Review as the later unrelated Back destination.
- **Impact:** Learning and gates remain intact, but Back can unexpectedly jump to an older screen rather than the screen that opened Tracks.
- **Fix:** Establish the return origin for every entry into Tracks (avoid overwriting it on same-view changes), or route the direct/history paths through a common entry helper. A small interaction/state-transition check should exercise a prior non-Home origin followed by a new secondary/history entry.

#### M2 — Design-system documentation still describes the interim Library

- **Location:** `docs/DESIGN-SYSTEM.md:31`.
- **Problem:** It says Library temporarily hosts SourceStudio pending its dedicated experience, although the completed branch implements that dedicated Library/Create split.
- **Impact:** Maintainers following the current design contract receive stale task-phase guidance.
- **Fix:** Describe the completed saved-course Library and shared SourceStudio state owner instead.

## Recommendations

Resolve I1 and I2 before publication. M1 is a small navigation consistency fix worth completing in the same repair pass; M2 is documentation-only. Preserve the tested source/schema/engine boundaries. Use focused behavioral verification for I1/M1 and computed-style checks for I2, then refresh the final source/artifact verification as required by the changed runtime; avoid redundant cosmetic test scaffolding.

## Declined to judge

- Final desktop/390px geometry, complete keyboard traversal and screenshots: controller-owned browser QA is in progress; this review inspected static rules and supplied historical evidence but did not independently open a browser.
- Manual native file-picker/PDF-upload interaction: the tool previously hung and the controller explicitly excluded another chooser attempt; pasted-source flow and existing extraction regression are the available evidence.
- Publication success and final remote Site ID/URL/custom audience: deployment has not occurred in this reviewed head; no source/config change here alters them, and the controller owns service verification.
- Human content correctness/read-through and scoring-dispute evaluation: unchanged teaching content and an explicitly pending separate content audit, outside this UI migration.
- Baseline npm/proxy/Vinext notices and pre-existing standalone TypeScript diagnostics: documented environment/baseline conditions; no new failure in the fresh required build/test/lint gates and no optional TypeScript rerun authorized.
- General repository-wide security/performance refactoring and unrelated pre-existing learning-engine behavior: outside this bounded UI migration; unchanged callers were inspected only where the new wiring posed a concrete integration risk.

## Assessment

**Ready to merge? With fixes.**

The integrated migration preserves the real learning engines and provides the approved navigation/Library/Workspace architecture with strong fresh regression evidence. Publication should wait for explicit source-review error handling and the remaining instructional-body typography correction; no Critical defect or schema/grader regression was found.
