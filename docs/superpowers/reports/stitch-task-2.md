# Task 2 implementation report

Status: DONE

## Implemented

- Added pure `filterSourceCourses` and `sourceCourseProgress` helpers. Search ignores case, combining accents and Đ/đ, intersects source kind, preserves ordering and leaves source/evidence objects unchanged. Progress counts actual completed source lessons only.
- Separated Library from Create Course using one `SourceStudio` owner. The dashboard no longer uses a view/course/lesson key to remount it. Optional `navigationId` increments through the existing navigation handler so clicking Library again resets an open reader while preserving the unsaved create draft. Course/lesson prop changes resolve through a route effect against the latest successfully committed saved records.
- Built a saved source grid with decorative inline SVG covers, provenance, actual lesson/progress counts, labelled search/kind filters, open/remove actions, and loading/empty/no-results/storage failure states.
- Exposed all actual R0 lessons and R1–R4 labs from their catalogs through real callbacks. No catalog completion is invented. Expansion callbacks use the existing `openExpansionItem` path, which clears stale review/edge state.
- Placed source extraction/input and draft review beside each other on desktop and stacked them on smaller screens. Draft title, lesson titles and existing objectives are editable. Explicit save requires at least two selected lessons and successful hydration/storage access. No saved source engine/schema/limits/answers/excerpts were changed.
- Kept source reader/questions and 72h review runtimes intact, with a return-to-library action. Successful review feedback now reads the committed `reviewedAt` evidence so it continues to say that the review was recorded after the due-state calculation changes.
- Guarded access to the localStorage property and JSON parsing in hydration. Malformed/denied storage surfaces an error and blocks destructive overwrites. Failed writes do not update courses, clear the draft, or report a successful answer. Missing exact course/lesson requests show an explicit missing-target message instead of falling back to another lesson.
- Added honest disclosures: local sampling of at most six passages, URL provenance only, transcript needed for video, text/OCR needed for scanned PDF, and edited explanation goals are not automatically graded.

## TDD evidence

### RED

Command: `node --test tests/course-library.test.mjs`

Observed before implementation: 4 tests failed, 0 passed. Each expected helper to be a function and got `undefined`, because `lib/course-library.ts` did not yet exist. The tests exercised case/accent/Đ search, kind intersection/empty/no-result behavior, actual zero/partial/completed progress and input immutability. This was the expected missing-feature failure.

### GREEN

Same command after implementation: 4 tests passed, 0 failed. Final tests use a normal module import; the temporary missing-module accommodation used for the RED observation was removed.

## Verification

1. Focused command:
   `node --test tests/course-library.test.mjs tests/source-course.test.mjs tests/source-draft.test.mjs tests/source-sections.test.mjs tests/navigation-utility.test.mjs`
   Result: 19 passed, 0 failed, exit 0. Existing source excerpts, varied answer positions, 72h review, draft identity/evidence, malformed state, portable backup, markdown/transcript locators and exact Review route assertions passed.
2. Full command, run once: `npm test`
   Result: authoring QA passed (14 lessons, 70 activities, 42 misconception checks, 42 hidden tests, 56 explanation boundaries, 3 verified sources), all five production build phases passed, 150 tests passed, 0 failed, exit 0.
   Log: `/workspace/scratch/8052a705d640/task2-npm-test.log`.
   Existing environment output: npm warns about `http-proxy`; build reports detected proxy variables. No test failures.
3. Scoped lint:
   `bash scripts/sites-env.sh -- ./node_modules/.bin/eslint app/source-studio.tsx app/learning-dashboard.tsx components/learning/course-library.tsx lib/course-library.ts tests/course-library.test.mjs`
   Result: exit 0, no output. An initial command with bare `eslint` returned command-not-found because the direct shell PATH omits node_modules/.bin; the explicit local executable succeeded.
4. `git diff --check`: exit 0.

## Files changed

- `app/source-studio.tsx`
- `app/learning-dashboard.tsx`
- `app/stitch-theme.css`
- `components/learning/course-library.tsx` (new)
- `lib/course-library.ts` (new)
- `tests/course-library.test.mjs` (new)
- This report.

## Self-review

Reviewed the full source studio/dashboard diff and new component/helper, checked that source engine/storage keys/schema/evidence were unchanged, write failures retain old records/draft, missing targets cannot choose a fallback lesson, all catalog entries are exposed, and same-view navigation has an explicit route signal. Existing large studio/dashboard files remain focused changes; no unrelated restructuring or dependency was added.

## Limits / controller follow-up

No browser, filechooser, dependency installation, push or deployment was used, as assigned. Controller should verify paste-text draft/edit/save/open/reload, same-view Library reset, draft retention across Library/Create, exact source Review target, keyboard focus and 390px layout in the browser. Existing standalone TypeScript diagnostics were not rerun, as directed. No fake AI/backend/catalog progress was introduced.

Recovery: commit and verified `git bundle create /workspace/scratch/8052a705d640/stitch-task2.bundle --all` are supplied with the completion message. This report is force-added despite the ignored control directory so the bundle preserves it.
