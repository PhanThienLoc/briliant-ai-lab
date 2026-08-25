# Contributing

## Working agreement

- Keep each change small enough to review.
- Add or update tests for behavior changes.
- Do not publish copied book text, figures, or exercises.
- Keep content source-backed and explanations original.
- Preserve deterministic scoring and mastery invariants.
- Record architecture decisions in `docs/ARCHITECTURE.md` when a change affects future components.

## Before opening a pull request

```bash
npm run lint
npm test
```

The pull request should explain the learner outcome, implementation trade-off, failure modes, and evidence used to verify the change.
