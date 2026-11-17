# Task 3 — B09 in-app draft retention

## Cause and implementation

The dashboard conditionally mounted SourceStudio only for Create/Library; moving to Review or another page destroyed its local form and draft state. The create form also unmounted when the same studio switched to Library, dropping the native file input.

- Keep one SourceStudio mounted for the dashboard lifetime, with `hidden`, `inert` and explicit `display: none` while another workspace is visible.
- Keep the create form DOM mounted across Create/Library mode changes. The selected File/native input, page range, source fields, text, title, generated draft, lesson selections, edits and validation message remain in memory.
- Gate reader heading focus on studio visibility so background route effects do not steal focus.
- After successful Passport restore, a dedicated library revision refreshes the saved courses/ref from localStorage, clears a recovered storage error and reapplies any library target. Draft state is not reset. No navigation writes a course; saving still uses the existing validated explicit action and clears the saved draft.
- Explain the lifetime in the draft footer: navigation retains it; reload/closing loses it.

Files: `app/source-studio.tsx`, `app/learning-dashboard.tsx`. No dependencies or persistence keys added. Task1 source-course and Task2 dashboard evidence changes retained.

## Verification

Browser red supplied by controller before implementation: create a two-section Markdown draft titled `QA P2 Draft navigation`; Review → Create resulted in draft heading count 0 and empty title. This is the behavioral reproduction; no mirror/source-string test added.

Commands run from the checkout:

- `node --test tests/source-draft.test.mjs` — PASS, 2/2 (selection/edit/evidence preservation and invalid publication rejection).
- `node_modules/.bin/eslint app/source-studio.tsx app/learning-dashboard.tsx` — PASS, exit 0.
- `git diff --check` — PASS.
- `node_modules/.bin/tsc --noEmit --incremental false` — FAIL, exit 2. Exact diagnostics below; no baseline comparison performed, so this report does not classify their origin:

```text
app/expansion-workbench.tsx(92,191): error TS7006: Parameter 'step' implicitly has an 'any' type.
app/expansion-workbench.tsx(92,349): error TS7006: Parameter 'column' implicitly has an 'any' type.
app/expansion-workbench.tsx(92,430): error TS7006: Parameter 'row' implicitly has an 'any' type.
app/expansion-workbench.tsx(92,435): error TS7006: Parameter 'index' implicitly has an 'any' type.
app/expansion-workbench.tsx(92,482): error TS7006: Parameter 'column' implicitly has an 'any' type.
app/expansion-workbench.tsx(283,772): error TS7006: Parameter 'value' implicitly has an 'any' type.
app/expansion-workbench.tsx(283,930): error TS7006: Parameter 'value' implicitly has an 'any' type.
app/expansion-workbench.tsx(292,989): error TS7006: Parameter 'sum' implicitly has an 'any' type.
app/expansion-workbench.tsx(292,994): error TS7006: Parameter 'value' implicitly has an 'any' type.
app/learning-dashboard.tsx(431,158): error TS2339: Property 'outcome' does not exist on type 'LessonContent'.
app/learning-dashboard.tsx(798,101): error TS2322: Type 'string[]' is not assignable to type 'never[]'.
  Type 'string' is not assignable to type 'never'.
app/learning-dashboard.tsx(1007,87): error TS2367: This comparison appears to be unintentional because the types '"review_due"' and '"mastered"' have no overlap.
db/index.ts(1,21): error TS2307: Cannot find module 'cloudflare:workers' or its corresponding type declarations.
worker/index.ts(6,11): error TS2304: Cannot find name 'Fetcher'.
worker/index.ts(7,7): error TS2552: Cannot find name 'D1Database'. Did you mean 'IDBDatabase'?
```

## Limits / controller handoff

No full build, install, browser automation or publication performed by this implementer. Controller must verify UI green: title/input/file/page settings retained after Review and Library; edited draft title/goals/selections retained; hidden controls inaccessible/no focus steal; explicit save creates one course; a valid Passport restore refreshes the library and subsequent save preserves restored records. The two passing unit tests validate existing finalization behavior, not component lifetime. Drafts intentionally survive only the current dashboard instance; no reload persistence or cross-tab synchronization is promised.
