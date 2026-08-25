# Architecture

## Direction

Release 0 is content-driven and deterministic at its core. An AI tutor is an assistive boundary, not the source of truth for scoring or mastery.

## Layers

1. **Experience:** responsive Next.js/Vinext interface and reusable activity components.
2. **Content:** versioned JSON/MDX validated against schemas.
3. **Learning domain:** attempts, evidence, misconceptions, mastery transitions, and review scheduling.
4. **Execution:** browser-isolated Python for bounded educational labs; an isolated SQL environment in a later milestone.
5. **Tutor:** provider-abstracted structured responses grounded in activity state and sources.
6. **Persistence:** PostgreSQL/Supabase direction for users and learning state; no production binding in the first static slice.
7. **Observability:** append-style learning events for attempts, hints, feedback, and transitions.

## Core entities

- `concepts`
- `concept_prerequisites`
- `courses`
- `lessons`
- `activities`
- `activity_variants`
- `attempts`
- `misconceptions`
- `mastery_states`
- `review_queue`
- `projects`
- `project_artifacts`
- `sources`
- `tutor_events`

## Mastery invariant

The tutor cannot directly set mastery. `mastered` requires:

- standard problem correct without hints;
- variant correct;
- transfer correct;
- delayed retrieval correct after at least 72 hours;
- no unresolved critical misconception.

The initial implementation is in `lib/mastery.mjs` and is intentionally small enough to audit.

## Security boundaries

- Never execute arbitrary learner code in the application server process.
- Keep code labs isolated and resource-bounded.
- Treat lesson JSON, tutor output, and learner text as untrusted input.
- Do not expose book files or copyrighted source pages through the product.
- Use least-privilege access for tools, data, and future agent actions.
- Preserve evaluation traces without storing secrets or unnecessary personal data.

## Decision log

- Web/PWA before native mobile.
- Git-versioned content before CMS.
- Rule-based adaptation before knowledge-tracing ML.
- Original lesson writing with source metadata.
- Provider abstraction for fast-changing AI APIs.
