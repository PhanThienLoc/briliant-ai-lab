# Task 1 — shared Stitch theme, navigation and Home

## Status

DONE. Implemented on `feat/stitch-ui`, from pristine v33 base `1beba56`. No browser, dependencies, remote push or deployment used. Library temporarily hosts the existing SourceStudio as permitted; the dedicated Library/Create experience and focused Workspace belong to later tasks.

## Implementation

- Added `app/stitch-theme.css` imported after globals. Approved paper/white/ink/muted/emerald/selected/evidence palette, Inter/Manrope/Arial stack, 16px body, 14px metadata, 32–40px page headings, 12–16px panels, thin borders, visible focus and >=44px controls.
- Removed obsolete brutalist override blocks and old conflicting palette roots. Kept existing layouts/instruments, replaced the old heading font, and lifted legacy small metadata directly. The final theme explicitly covers dense-result label/output, token RAW TEXT, embedding labels, Code Coach direct outline/text actions and other former dark surfaces. Mental-block, delayed-review, activity-brief and hint prose explicitly use 16px; response labels explicitly use 14px. Selected instrument cards have no hard offset shadows.
- Added four primary destinations to the 220px sidebar and mobile navigation: Hôm nay, Thư viện, Tạo khóa học, Ôn tập. Tracks, Map, Passport/Checklist, Socratic Lab, Help and History remain in accessible secondary disclosure controls. Inline SVG icons replace text icons; device-local wording replaces the fabricated learner/profile level. Added skip link and main landmark; navigation exposes current-page semantics.
- Home uses the literal approved Vietnamese headline/support. Its actual first TodayQueue item leads with reason/evidence and onward action. R0/expansion reviews and real topics are compact; course access and creation have distinct onward actions. Mastery, diagnostics, analytics, repair tools and recent history are expandable.
- Hydration renders a loading status rather than false empty progress. Empty TodaySession opens the diagnostic.
- Review lists the full real R0/expansion queue and saved-source review access. R0 due routes preserve review mode, source routes preserve exact course/lesson identity, and R0/expansion/source return callbacks preserve their Review origin. SourceStudio is keyed by view/course/lesson so changing the target cannot reuse a stale course selection. Existing 72h runtime gates are untouched.
- Updated DESIGN-SYSTEM.md and obsolete visual/navigation/SSR expectations. Preserved content, SQL/Python grader, evidence, prerequisite/bridge, repair, backup and review-time learning assertions and all storage keys/schemas.

## TDD evidence

### RED

Command: `node --test tests/design.test.mjs tests/adaptive-hub.test.mjs`

Before implementation: **8 passed, 4 failed**. Expected failures: missing `app/stitch-theme.css` (ENOENT) and absent hydrated loading / diagnostic-action boundary. The old brutalist visual assertions were replaced first; existing learning assertions remained.

### GREEN

Same command after implementation: **12/12 passed**.

Final focused command: `node --test tests/design.test.mjs tests/adaptive-hub.test.mjs tests/navigation-utility.test.mjs tests/expansion-labs.test.mjs`

**25/25 passed, 0 failed**. Coverage includes palette and calculated WCAG contrast pairs, resolved descendant foreground/panel pairs for the prior cascade pitfalls, explicit prose sizes, hydration/empty behavior, queue target routing, four primary destinations, retained secondary controls and review origins. These are source-level checks, not a substitute for browser computed-style/responsive verification.

## Required gates

- `npm test` run exactly once: **PASS**. Content audit and production build completed; **146/146 tests passed**, 0 failures, 0 skipped (144 baseline + 2 added navigation/review tests).
- `npm run lint`: **PASS**, no ESLint findings.
- `git diff --check`: **PASS**.
- No baseline rebuild or optional standalone TypeScript run was performed; the controller established 15 existing diagnostics beforehand.

Warnings: npm reports unknown environment config `http-proxy`; the build reports detected proxy environment variables. Content audit states human read-through and local scoring-dispute review remain pending. No new application warnings were observed.

After the full gate, self-review narrowed a broad CSS text-size edit back to font declarations only, removed the remaining obsolete mobile brutalist block and selected-card shadows, and strengthened the descendant contrast assertions. The final focused 25-test command and diff check passed afterward. No runtime/learning logic changed after the full gate.

## Files changed

- `app/globals.css`, `app/stitch-theme.css`, `app/layout.tsx`
- `app/learning-dashboard.tsx`
- `components/learning/adaptive-hub.tsx`, `components/learning/today-session.tsx`
- `docs/DESIGN-SYSTEM.md`
- `tests/design.test.mjs`, `tests/adaptive-hub.test.mjs`, `tests/navigation-utility.test.mjs`, `tests/expansion-labs.test.mjs`, `tests/rendered-html.test.mjs`
- This report.

## Self-review and concerns

- Confirmed no lib, content catalog, grader, repository, schema, storage key or package changes.
- Corrected parent-only pale-foreground gaps and explicit old prose sizes, rather than relying on inherited color/font size.
- Corrected remaining hard offset selected-state shadows and restored original spacing after narrowing the metadata/font update.
- Existing `learning-dashboard.tsx` and globals remain large; changes follow the existing component organization and keep instruments in place.
- Browser/390px/keyboard/runtime review is intentionally left for the controller, per the no-browser assignment. Temporary Library/SourceStudio sharing is an explicit Task 1 allowance.

## Checkpoint

The local commit is followed by `git bundle create /workspace/scratch/8052a705d640/stitch-task1.bundle --all` and bundle verification. The controller receives the exact SHA and bundle location in the completion message.


## Review fix round 1

Addressed both Important findings from `task-1-review.md` with a scoped theme/test patch:

- Added `.gradient-chain .gradient-card > span` to the explicit muted-ink foreground rule. The direct derivative label now resolves to `#526258` on `#EDF3FA`, and the descendant contrast policy calculates its ratio against the panel background.
- Included `.app-shell .hint-ladder p` in the explicit 16px prose rule and its size policy check.
- No runtime, layout, learning-state or storage changes. No full suite, browser, push or deployment run.

RED command: `node --test tests/design.test.mjs tests/adaptive-hub.test.mjs`

Expected failure after adding regression coverage, before the CSS fix: **11 passed, 1 failed**, `AssertionError [ERR_ASSERTION]: resolved contrast pair: .gradient-chain .gradient-card > span` (`tests/design.test.mjs:99`).

GREEN command: `node --test tests/design.test.mjs tests/adaptive-hub.test.mjs`

Exact output:

```text
✔ Today Session exposes dynamic budget, reasons, evidence, and semantic progress (10.39478ms)
✔ reflection actions stay readable and never open a null target (1.676559ms)
✔ Mastery Summary names every actionable state and counts only locked concepts (1.509399ms)
✔ adaptive cards use calm surfaces, readable text, and touch targets (1.637605ms)
✔ Home separates hydration from empty queues and exposes the diagnostic action (1.825445ms)
✔ adaptive cards stack at the existing mobile breakpoint (5.115581ms)
✔ AdaptiveHub hydrates local state after mount and routes by target kind (1.044517ms)
✔ dashboard uses the adaptive Hub boundary instead of four direct storage hooks (4.057248ms)
✔ adaptive Hub refreshes when the clock moves while the Hub remains open (1.585138ms)
✔ adaptive routes preserve lesson mode, repair activity, and expansion bridge edge (4.920247ms)
✔ the interface follows the approved calm learning system (18.28138ms)
✔ calm surfaces retain explicit readable child colors and learning state semantics (12.949397ms)
ℹ tests 12
ℹ suites 0
ℹ pass 12
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 200.127917
```

Command: `git diff --check`

Exact output: empty; exit status **0**.

The local fix commit is followed by a refreshed and verified `/workspace/scratch/8052a705d640/stitch-task1.bundle` checkpoint.
