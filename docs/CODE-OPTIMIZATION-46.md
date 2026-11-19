# Focused cleanup and bug fixes — v46

## Changes

- Reuse one draft reset operation when article import, file selection/extraction, PDF page range or source text changes. In-memory source coverage and generated practice are invalidated; saved courses/drafts are not deleted. This also causes the existing AI consent/request invalidation effect to run.
- Do not rewrite already-recorded initial teaching completion. Keep its original timestamp even when storage writes are now blocked. Serialize changed progress once, validate before writing, and preserve existing failure behavior.
- Consume HTMLRewriter output as a stream rather than materializing an unused full HTML ArrayBuffer. Preserve paragraph/heading closing boundaries so following text is not joined to the final word. No measured latency or memory benchmark claimed.

## Verification

- `npm test`: production typecheck, content audit, Worker build and 314/314 regressions passed.
- Native Worker HTMLRewriter fixture verifies paragraph/heading/BR boundaries and removal of navigation/scripts.
- New progress regression verifies repeated completion performs zero writes even under quota failure.
- Browser: create a source coverage draft, edit input, verify previous coverage/selection disappears and AI send-preview button becomes disabled. No AI provider call made.
- `npm run lint`: zero errors; three existing unused-disable warnings in generated `types/worker-runtime.d.ts`.
- `git diff --check`: passed.

## Limits

No physical Android run, actual-key AI generation, successful live external article import, or performance benchmark was performed in this pass. This is a targeted cleanup, not a complete application bug-free certification. No dependencies or schema changes.
