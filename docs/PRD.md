# Product Requirements Document - Release 0

## Problem

Self-directed AI/Data learners can consume explanations and copy code without developing a connected mental model. Progress is usually measured by completion, while the real target is independent transfer after a delay.

## Initial learner

A Vietnamese Data Science student who:

- targets AI/Data engineering roles at BigTech;
- prefers intuitive, system-oriented explanations;
- can code with support but needs stronger foundations;
- needs Vietnamese explanations while improving technical English;
- is motivated by explicit milestones and measurable feedback.

## Job to be done

When studying a difficult AI/Data concept, help the learner discover why it is needed, manipulate it, reason about it, implement it, and prove later that it can be used in a new context.

## Release 0 outcome

Deliver one coherent 14-lesson course, **From Raw Data to a Learning Model**, and the minimum learning engine required to complete it.

## Primary flow

1. Open Today.
2. See a bounded queue based on prerequisite and review state.
3. Attempt the next activity before receiving instruction.
4. Manipulate a visual model and receive error-specific feedback.
5. Complete independent, explanation, code, and transfer activities.
6. Record evidence and misconception categories.
7. Schedule delayed review.
8. Update mastery only after deterministic gates pass.

## Required capabilities

- Learner diagnostic.
- Today queue.
- Concept dependency map.
- Prediction, manipulation, ordering, response, Python, explanation, and transfer activities.
- Hint ladder with answer-reveal policy.
- Deterministic mastery state machine.
- Review scheduling.
- Misconception log.
- Progress view.
- Six guided interactive mechanism labs spanning all 14 lessons.
- Device-local learning mirror for evidence, retries, hint dependency, code failures, and scoring disputes.
- Versioned Learning Passport export/import with allowlist validation and rollback.
- Natural explanation coach with anti-hint-copy defense and a device-local repair queue.
- Per-lesson concept aliases and a release-blocking boundary-answer calibration suite.
- Source citations.
- Vietnamese-first content with canonical English terms.

## Non-goals

- Native mobile app.
- Payment/subscription system.
- Social feed or leaderboard.
- Public content-authoring CMS.
- Arbitrary server-side code execution.
- GPU training platform.
- Fully autonomous content generation.
- ML-based personalization before a rule-based baseline is measured.
- Accounts, hosted database, server telemetry, social comparison, or multi-device sync.

## Release acceptance

- All 14 lessons work end-to-end.
- At least five activity types render from versioned content.
- Progress persists without a blocking loss-of-state defect.
- A valid local backup can restore learning state; an invalid or partially failed restore cannot overwrite the previous state.
- Guessing repeatedly cannot produce mastery.
- Pasting hints, including hints followed by a shallow connector, cannot pass an explanation activity.
- A failed explanation creates one concrete repair item; a later valid explanation removes it without storing the raw answer.
- All 14 explanation activities pass canonical and synonym-positive cases while rejecting copied-hint and fluent-but-incomplete cases.
- Personal target: delayed recall is at least 75% after seven days.
- Personal target: novel-transfer success is at least 70% without high-level hints.
- Every lesson has reviewed sources, original explanation, scoring rules, and misconception coverage.

## Product metrics

- Seven-day and 21-day retention.
- Transfer success without hints.
- Hint dependency by concept.
- Recurring misconception rate.
- Time from `learning` to `mastered`.
- Review-queue completion.
- Local content defects and scoring disputes marked for self-review.
