# Final integrated fixes — 2026-11-15

## Scope and changes

Starting head: `22c061d85c10f9b4b058c50ad32a2a2ef01cbfdc` on `feat/stitch-ui` (runtime reviewed at `cc44a693f26a5ac50d996d39166d926a1c5e2730`). Implemented the complete I1/I2/M1/M2 repair brief in one wave.

- **I1:** `readSourceCourses` now accepts a storage getter and returns explicit success/error results. Storage property access, `getItem` and the existing parser share one guarded boundary. SourceReviews separates initial loading, read failure and successful empty state; failures show an alert with a read-again action, hide the due count/empty success message and never write data. The sole runtime caller is updated. No storage key, schema or parser validation changed.
- **I2:** A final scoped instructional-prose rule overrides the legacy metadata selector group for answer feedback, explanation-coach paragraphs, completion/evidence explanations, Code Coach algorithm/explanation copy and SQL/lab challenge/feedback paragraphs. Body copy is 16px with 1.65 line height. Labels, metadata, code and numeric traces retain their existing rules. No CSS declaration-mirroring tests added.
- **M1:** `openView` captures Tracks' return origin on every actual entry, including secondary navigation and recent history. Same-view navigation preserves the origin. Explicit expansion lab, edge and review targets still apply after entry; source and R0 return handling are unchanged.
- **M2:** DESIGN-SYSTEM now describes the completed saved-course Library/Create split and their one SourceStudio state owner.

## Verification

| Command / evidence | Result |
| --- | --- |
| `node --test tests/source-course.test.mjs` before implementation | RED: 9 tests; 4 passed, 5 failed. Failures exposed the missing explicit error/result contract and guarded getter/read boundary. |
| Same focused command after implementation | GREEN: 9 passed, 0 failed. An initial run was 8/9 because the recovery fixture compared a nonserialized `sourceUrl: undefined` property; supplying a real fixture URL corrected that test-only mismatch. |
| Controller's pre-fix browser sequence: Library → SQL expansion → Back → Home → secondary Tracks → Back | RED supplied by controller: incorrectly returned to Library. Controller owns exact browser GREEN and history/same-view interactions; no source-string navigation test substituted. |
| `npm test` (one integrated full run) | Exit 0; verified production build and authoring QA passed. **154 tests, 154 passed, 0 failed, 0 skipped**. Authoring QA: 14 lessons, 70 activities, 42 misconception checks, 42 hidden tests, 56 explanation boundaries, 3 verified sources. |
| `npm run lint` (one integrated run) | Exit 0; no ESLint diagnostics. |
| `node --test tests/source-course.test.mjs` after test assertion hardening | 9 passed, 0 failed. Test-only change records read keys/mutation attempts outside the reader's catch boundary, so swallowed assertions cannot hide writes. No runtime change followed full build/test/lint. |
| `git diff --check` | Exit 0, no whitespace errors. |

Focused checks exercise denied localStorage property access, denied `getItem`, malformed JSON, successful retry with the exact persisted course/review date, genuine missing-key empty success, and zero write/delete/clear attempts. Existing excerpt, answer, 72-hour review and backup portability assertions remain.

## Self-review and limits

Reviewed the final diff and every `readSourceCourses` caller. Error results have `courses: null`, so they cannot render a false zero-count or empty success. Retry reads the same key through the same boundary. The Tracks entry guard is centralized and deliberately excludes same-view changes. The final prose selector has sufficient specificity to beat globals' metadata `:is` group without `!important`; narrow metadata/code descendants keep their own font sizes.

No graders, engines, gates, source IDs/excerpts/answers, persistence owners, dependency manifests, Site identity/access, backend or runtime dependencies changed. No browser, file chooser, subagents, push or deployment used. No temporary public QA file added.

Browser computed typography, route GREEN, storage warning presentation, keyboard/390px checks and screenshots remain controller-owned. No independent browser/standalone TypeScript rerun performed. The full gates emitted the existing npm unknown `http-proxy` configuration warning and proxy-environment fetch notice; neither failed a gate. A Git bundle containing all refs is produced and verified outside the Site directory at `/workspace/scratch/8052a705d640/stitch-final-fix.bundle` after this report is committed.
