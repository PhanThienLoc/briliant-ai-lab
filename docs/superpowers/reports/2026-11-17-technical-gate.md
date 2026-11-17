# Task 1 — Technical gate

Base: v40 `ba1bf9b`. No dependency changes.

## Root causes and changes

- Reproduced the exact 15 diagnostics listed in the P2 report with `node_modules/.bin/tsc --noEmit --incremental false` (exit 2). Nine callback errors came from inferred JS arrays/records in SQL and R4 helpers; the explanation grader's default empty hints inferred `never[]`. Added adjacent `.d.mts` declarations describing all public exports and concrete nested results, including nullable SQL values. Runtime JS and Python boolean/numeric behavior remain unchanged.
- The diagnostic recommendation read an absent `LessonContent.outcome`; render its existing `mechanism` instead. Preserve the mastery/choice submit guard, computing it before JSX narrows mastery to `review_due`.
- Generated genuine Cloudflare runtime declarations with the installed, pinned Wrangler 4.92.0 / workerd 1.20260515.1. Reproduce with `npm run types:worker`; `scripts/worker-types.json` is used only for declaration generation and does not change Vite/deployment configuration. Runtime declarations retain upstream license and generation provenance. Merge only the project's optional DB binding into `Cloudflare.Env` because hosting currently has no D1 configuration; keep the existing runtime DB absence check. Worker uses genuine Fetcher, ImagesBinding and ExecutionContext instead of hand-written partial runtime interfaces. Narrow vinext's string format to its three actual negotiated image MIME types before the ImagesBinding call. Use DOM `appendChild` for the same single anchor operation to avoid Cloudflare HTMLRewriter `Element.append` colliding with DOM `Element.append`.
- `npm run typecheck` now runs the complete existing strict TypeScript configuration without incremental cache. The verified build invokes it before authoring QA, so both `npm test` (which invokes build) and release builds fail on type errors. No TypeScript settings, checked files or guards removed; existing skipLibCheck setting unchanged.
- Backup summary allowed expansion v1 imports but counted only v3/v2. Include v1 in the same newest-first fallback, preserving empty-current-key precedence and distinct-ID counting.
- PDF.js rejected password/corrupt document loading with English exception messages. `sourcePdfError` provides Vietnamese unlock/re-download guidance, keeps existing range/text-layer errors, and is called on document-load rejection in SourceStudio. No password collection, network fetch, OCR or file persistence introduced.

## Red / green evidence

- Before changes: TypeScript exit 2, exactly the 15 documented diagnostics.
- New backup regression red: v1-only summary returned 0, expected 2. New PDF tests red: mapper module absent. Combined red command `node --test tests/learning-backup.test.mjs tests/pdf-error.test.mjs`: 23 pass, 2 fail.
- Green `npm run typecheck`: PASS, exit 0, no diagnostics.
- Green `node --test tests/learning-backup.test.mjs tests/pdf-error.test.mjs tests/r4-labs.test.mjs tests/explanation-grader.test.mjs tests/sql-null-empty.test.mjs tests/deployment-reliability.test.mjs`: PASS, 68/68, including NULL semantics and empty aggregates.
- `npm run types:worker -- --check`: PASS, exit 0, generated declarations current.
- Focused ESLint on changed app/worker files, new handwritten declarations and PDF mapper: PASS, exit 0.
- `git diff --check`: PASS.

## Limits / handoff

No install, full suite, build, browser, or publication performed by this implementer. Controller must run full gates and browser checks. PDF tests exercise error classification; they do not launch a real browser/PDF worker or submit a password-protected binary. Task2 should preserve the mapper when moving extraction. Generated runtime declarations share the current browser TypeScript program; the existing upstream declaration-skip setting remains unchanged. Regenerate declarations when Wrangler or worker compatibility configuration changes.
