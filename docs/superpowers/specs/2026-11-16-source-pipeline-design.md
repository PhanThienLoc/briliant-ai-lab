# Source-grounded courses: proposed design

Status: planning and baseline verification; no new runtime implementation in this checkpoint.

## Goal

Turn selected book chapters, papers, articles and supplied transcripts into a reviewable course whose coverage and evidence are inspectable. Preserve the existing Library, learning evidence and 72-hour review rules.

## Observed baseline

`lib/source-course.ts` builds 2–6 sampled reading exercises, each supported by a quoted passage. Questions ask which sentence appears in that passage; this is recognition, not verified conceptual understanding. `app/source-studio.tsx` extracts at most 60 PDF pages and 120,000 characters; PDF files are limited to 30 MiB. URLs are provenance only. Text extraction is not OCR. Existing persisted courses accept at most six lessons.

Two new boundary probes found invalid review dates accepted by both parser and completion, and missing objectives/locators accepted by the parser. These precede feature expansion.

## Recommended delivery strategy

1. **Milestone A — reliable source foundation:** validate existing records; extract source parsing from the component; represent every selected section with stable locators; expose covered, excluded and unreadable sections. Local processing, no model dependency or recurring API cost. It remains explicitly a reading/practice foundation.
2. **Milestone B — generated course pilot:** add a server-side provider adapter, concept prerequisites, explanations, worked examples and transfer questions. Pilot one selected chapter before claiming whole-book coverage. Review and approve drafts before saving. A separate design must choose provider, execution environment, retention and per-job budget before implementation.
3. **Milestone C — long documents and input expansion:** resumable chapter batches, then article fetching, transcript retrieval and OCR. Each integration gets independent provenance, failure and cost tests. Do not treat a pasted URL as imported content.

Alternatives: a full browser-only model avoids a hosted provider but adds substantial download/device constraints; an all-at-once cloud pipeline adds storage, jobs and cost before evidence quality is established. The incremental hybrid approach above is a recommendation, not a provider choice already approved by the user.

## Milestone A requirements

- Keep `briliantai.source-courses.v1`, existing IDs and original saved bytes on read failure.
- Validate nonempty objective and sourceLocation, unique course IDs and lesson IDs within a course, finite timestamps and chronological completion/review relationships. An invalid date never opens a review.
- Review requires completedAt and reviewDueAt >= completedAt + 72 hours; reviewedAt cannot precede reviewDueAt. A read failure provides recovery feedback without silently deleting data.
- Retain current limits: 30 MiB PDF; 15 MiB text; 60 selected PDF pages; 120,000 source characters per batch. Report truncation explicitly with last processed physical page; never claim full coverage.
- Introduce separate local draft storage `briliantai.source-drafts.v2`, at most 10 drafts, at most 200 sections per draft, at most 4,000 characters per section. Exceeding storage/size limits gives an actionable error and preserves the previous saved draft.
- Locators use physical PDF page ranges, supplied transcript millisecond ranges, or Markdown heading path plus ordinal. Display page versus printed-page ambiguity explicitly.
- Exact excerpt references must resolve within the stored normalized source. Normalization must not change negation, number values or mathematical operators.
- Selecting fewer than two valid sections cannot publish an existing v1 course. Larger coverage drafts remain drafts; do not squeeze an entire book into the six-lesson v1 schema.
- Preserve the Stitch visual system, keyboard flow and 44px targets. No global UI rewrite.

## Milestone B acceptance proposal

One chapter produces a user-approved objective graph, explanations, worked examples, misconception feedback, initial checks and delayed transfer checks. Each factual explanation and answer carries resolvable source references. Schema validity is necessary, not sufficient: independently verify entailment, ambiguous answers and distractors. Unanswerable or weakly supported outputs stay blocked in the draft. No auto-published courses and no claim of expert-level mastery from a sentence-recognition question.

Pilot evaluation: 10 bounded sources spanning Vietnamese/English, PDF/Markdown/transcript; inspect every pilot lesson manually. Require 100% resolving locators and zero knowingly unsupported accepted answers; record excluded portions and reviewer disputes. Track quality, latency and measured cost per approved lesson before expanding. These are acceptance targets, not current measured results.

## External references checked

- OpenAI Structured Outputs documentation: https://developers.openai.com/api/docs/guides/structured-outputs — schema constraints do not replace business-rule validation; handle refusal, incomplete response and API error paths.
- PDF.js PDFPageProxy documentation: https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib-PDFPageProxy.html — retain page-linked text extraction as a separate stage.

## Decisions still required for Milestone B

Model provider and credentials, maximum cost per job, consent to upload selected source passages, and the supported background-job/storage mechanism. No credential is assumed present; no paid generation is performed by this plan.
