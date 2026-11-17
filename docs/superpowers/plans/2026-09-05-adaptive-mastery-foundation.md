# Adaptive Mastery Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring production to source parity and add an explainable, deterministic thirty-minute Today Queue driven by unified R0-R4 mastery evidence.

**Architecture:** Keep existing progress keys as sources of truth, place an asynchronous repository boundary in front of them, project all progress into immutable concept snapshots, and feed those snapshots into pure mastery and queue policies. The Learning Hub renders the queue and routes each action into the existing lesson or expansion runtime; deterministic graders remain the only authority for evidence.

**Tech Stack:** Next.js 16, React 19, TypeScript 5.9, Vinext/Vite, Node 22 native test runner, browser `localStorage`, Sites hosting.

**Spec:** `docs/superpowers/specs/2026-09-05-adaptive-mastery-foundation-design.md`

## Global Constraints

- Preserve Node.js `>=22.13.0`, the existing package manager, lockfile, Vinext build, and `.openai/hosting.json` project identity.
- Do not add dependencies, accounts, telemetry, a backend database, a CMS, or machine-learned personalization.
- Keep `briliantai.lesson.*.progress.v3` and `briliantai.expansion-progress.v3` as canonical evidence stores.
- Never store raw explanation text, learner code, stdout, or personal text in adaptive state.
- AI tutor output cannot set mastery or alter queue evidence.
- Mastery and queue ordering must be deterministic for identical evidence and an identical injected clock.
- Preserve all existing R0-R4 graders, delayed-review behavior, anti-bypass protections, and Learning Passport rollback semantics.
- Keep the academic neo-brutalist visual direction.
- Learner-facing text must be at least 12 CSS pixels; interactive targets must be at least 44 by 44 CSS pixels.
- State must be communicated by text or ARIA semantics in addition to color.
- Every production build must run the existing content audit.
- Publish only an exact commit that has passed lint, production build, and the complete regression suite.

## File map

### New files

- `lib/learning-repository.ts` — asynchronous storage boundary, normalization, warnings, and in-memory test repository.
- `lib/concept-evidence.ts` — unified R0-R4 `ConceptSnapshot` projection.
- `lib/adaptive-mastery.ts` — deterministic state and risk-policy functions.
- `lib/today-queue.ts` — candidate construction, scoring, stable ranking, and thirty-minute session selection.
- `components/learning/today-session.tsx` — Today Queue presentation and actionable reasons.
- `components/learning/mastery-summary.tsx` — cross-track mastery pulse.
- `components/learning/adaptive-hub.tsx` — client hydration hook and composition boundary for the two new Hub components.
- `tests/learning-repository.test.mjs` — storage, legacy, corruption, and quota behavior.
- `tests/concept-evidence.test.mjs` — R0-R4 projection and evidence-gate mapping.
- `tests/adaptive-mastery.test.mjs` — state transitions and risk flags.
- `tests/today-queue.test.mjs` — scores, tie-breaking, budgets, and reason strings.
- `tests/adaptive-hub.test.mjs` — static integration, routing, hydration, and accessibility contracts.

### Modified files

- `app/learning-dashboard.tsx` — replace four direct Hub storage hooks with `AdaptiveHub`, pass route callbacks, and refresh by revision.
- `app/globals.css` — add explicit dark-surface foreground token and Today/Mastery component styles.
- `lib/learning-backup.ts` — allowlist and validate `briliantai.adaptive-state.v1`.
- `tests/design.test.mjs` — dark-surface token and typography/target contracts.
- `tests/learning-backup.test.mjs` — adaptive-state export, validation, and rollback cases.
- `tests/rendered-html.test.mjs` — Today Queue and mastery summary rendered markers.
- `docs/ARCHITECTURE.md` — repository, projection, mastery, and queue boundaries.
- `docs/ROADMAP.md` — completed slices, release gate, and next project.

---

### Task 1: Establish the dark-surface token contract

**Files:**
- Modify: `tests/design.test.mjs`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: existing brutalist tokens `--on-surface`, `--surface-lowest`, and `--primary-container`.
- Produces: CSS custom property `--on-dark` and a test-enforced rule that black surfaces use it.

- [ ] **Step 1: Add a failing dark-surface design test**

Append these assertions to the existing `dark brutalist surfaces keep readable text and expose selected state` test:

```js
assert.match(css, /--on-dark:\s*#fffdf5/i);
assert.match(css, /\.primary-action\s*{[^}]*color:\s*var\(--on-dark\)/s);
assert.match(css, /\.new-session\s*{[^}]*color:\s*var\(--on-dark\)/s);
assert.match(css, /\.review-state\.due\s*{[^}]*color:\s*var\(--on-dark\)/s);
assert.match(css, /\.repair-state\.disputed\s*{[^}]*color:\s*var\(--on-dark\)/s);
```

- [ ] **Step 2: Run the focused test and confirm the missing token failure**

Run:

```bash
node --test tests/design.test.mjs
```

Expected: FAIL because `--on-dark` is not defined and the selectors still use literal `white`.

- [ ] **Step 3: Add the semantic token and replace dark-surface foreground literals**

Add to `:root` in `app/globals.css`:

```css
--on-dark: #fffdf5;
```

Replace learner-facing `color: white` on black, blue, and red filled controls with:

```css
color: var(--on-dark);
```

At minimum, update `.new-session`, `.primary-action`, `.review-state.due`, `.repair-state.disputed`, `.role-choice button.selected`, and any selector whose background is `var(--on-surface)`, `var(--primary-container)`, `var(--tertiary-container)`, or `var(--error)`.

- [ ] **Step 4: Run focused tests and the CSS static scan**

Run:

```bash
node --test tests/design.test.mjs
rg -n "color:\s*(black|#000|#111111|var\(--on-surface\)).*background:\s*(#111111|var\(--on-surface\)|var\(--primary-container\))" app/globals.css
```

Expected: design tests PASS; the scan prints no learner-facing dark-on-dark declaration.

- [ ] **Step 5: Commit the contrast contract**

```bash
git add app/globals.css tests/design.test.mjs
git commit -m "fix: enforce readable brutalist dark surfaces"
```

### Task 2: Verify and publish the source-parity checkpoint

**Files:**
- Modify: `docs/ROADMAP.md`

**Interfaces:**
- Consumes: exact commit from Task 1, existing Sites project ID in `.openai/hosting.json`.
- Produces: one saved and deployed Site version whose source provenance is the exact tested commit.

- [ ] **Step 1: Verify project identity and clean source state**

Run:

```bash
git status --short
git rev-parse HEAD
sed -n '1,80p' .openai/hosting.json
```

Expected: clean status; manifest project ID is `appgprj_6a8dd820e52081919d727df8547eeab7`.

- [ ] **Step 2: Record the parity checkpoint in the roadmap**

Under `## Trạng thái hiện tại` in `docs/ROADMAP.md`, add:

```markdown
- Release parity — hoàn thành: production đã nhận bản sửa tương phản brutalist và R4 vertical slice từ cùng một commit đã qua toàn bộ release gate.
```

- [ ] **Step 3: Commit the parity checkpoint**

```bash
git add docs/ROADMAP.md
git commit -m "docs: record R4 production parity"
git status --short
git rev-parse HEAD
```

Expected: clean status after the commit.

- [ ] **Step 4: Run all release gates on the exact commit**

Run:

```bash
npm run lint
npm test
git status --short
git rev-parse HEAD
```

Expected: lint PASS; content audit, production build, and all Node tests PASS; source state remains clean.

- [ ] **Step 5: Push, save, and deploy the tested commit through Sites**

Use `sites:sites-hosting` and the Sites connector in this order:

1. create a source repository write credential only if the prior one is missing or expired;
2. push exact `HEAD`;
3. run the Sites packaging command required by the hosting skill;
4. call `sites_save_site_version` with the exact `commit_sha`;
5. call the appropriate Sites deploy operation for the existing audience;
6. poll `sites_get_deployment_status` only while the result is non-terminal.

Expected: terminal successful deployment and a new production version whose source SHA equals `git rev-parse HEAD`.

### Task 3: Add the asynchronous learning repository boundary

**Files:**
- Create: `lib/learning-repository.ts`
- Create: `tests/learning-repository.test.mjs`

**Interfaces:**
- Consumes: `lessonCatalog`, `normalizeProgress`, `normalizeExpansionProgress`, `normalizeDiagnostic`, existing browser-storage key formats.
- Produces:
  - `LearningRepository`
  - `LearningRepositorySnapshot`
  - `LearningStorageWarning`
  - `AdaptiveState`
  - `createLocalStorageLearningRepository(storage)`
  - `createMemoryLearningRepository(snapshot)`
  - `normalizeAdaptiveState(value)`

- [ ] **Step 1: Write failing repository normalization tests**

Create `tests/learning-repository.test.mjs` with an in-memory `StorageLike` and these cases:

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  ADAPTIVE_STATE_KEY,
  createLocalStorageLearningRepository,
  normalizeAdaptiveState,
} from "../lib/learning-repository.ts";

class MemoryStorage {
  constructor(entries = {}, failOnSet = null) {
    this.values = new Map(Object.entries(entries));
    this.failOnSet = failOnSet;
  }
  get length() { return this.values.size; }
  key(index) { return [...this.values.keys()][index] ?? null; }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) {
    if (key === this.failOnSet) throw new Error("quota");
    this.values.set(key, String(value));
  }
  removeItem(key) { this.values.delete(key); }
}

test("repository reads current and legacy learning state without deleting it", async () => {
  const storage = new MemoryStorage({
    "briliantai.lesson.vectors.progress.v2": JSON.stringify({ completed: ["vec-predict"] }),
    "briliantai.expansion-progress.v2": JSON.stringify({ completedLabIds: ["logic-truth-table"] }),
  });
  const repository = createLocalStorageLearningRepository(storage);
  const snapshot = await repository.readSnapshot(new Date("2026-09-05T00:00:00.000Z"));
  assert.deepEqual(snapshot.lessons.vectors.completed, ["vec-predict"]);
  assert.deepEqual(snapshot.expansion.completedLabIds, ["logic-truth-table"]);
  assert.equal(storage.getItem("briliantai.lesson.vectors.progress.v2") !== null, true);
});

test("corrupt domains are isolated as warnings", async () => {
  const storage = new MemoryStorage({
    "briliantai.lesson.vectors.progress.v3": "{broken",
    "briliantai.diagnostic.v1": JSON.stringify({ invalid: true }),
  });
  const snapshot = await createLocalStorageLearningRepository(storage).readSnapshot();
  assert.equal(snapshot.lessons.vectors.completed.length, 0);
  assert.deepEqual(snapshot.warnings.map((item) => item.domain).sort(), ["diagnostic", "lesson:vectors"]);
});

test("adaptive preferences are bounded and storage failures are recoverable", async () => {
  assert.deepEqual(normalizeAdaptiveState({ sessionMinutes: 500, lastQueueIds: ["a", 2] }), {
    schemaVersion: 1,
    sessionMinutes: 60,
    lastGeneratedAt: null,
    lastQueueIds: ["a"],
  });
  const storage = new MemoryStorage({}, ADAPTIVE_STATE_KEY);
  const result = await createLocalStorageLearningRepository(storage).writeAdaptiveState(normalizeAdaptiveState(null));
  assert.equal(result.ok, false);
  assert.equal(result.warning.domain, "adaptive");
});
```

- [ ] **Step 2: Run the focused test and confirm the missing-module failure**

```bash
node --test tests/learning-repository.test.mjs
```

Expected: FAIL with module-not-found for `lib/learning-repository.ts`.

- [ ] **Step 3: Implement repository types and adaptive-state normalization**

Create `lib/learning-repository.ts` with these public definitions:

```ts
import { normalizeDiagnostic, type DiagnosticResult } from "./diagnostic";
import { emptyExpansionProgress, normalizeExpansionProgress, type ExpansionProgress } from "./expansion-progress";
import { lessonCatalog } from "./lesson-catalog";
import { initialLessonProgress, normalizeProgress, type LessonProgress } from "./mastery-engine";
import type { LocalLearningEvent } from "./local-learning-log";

export const ADAPTIVE_STATE_KEY = "briliantai.adaptive-state.v1";

export type AdaptiveState = {
  schemaVersion: 1;
  sessionMinutes: number;
  lastGeneratedAt: string | null;
  lastQueueIds: string[];
};

export type RepairItemSnapshot = {
  id: string;
  lessonId: string;
  activityId: string;
  lessonTitle: string;
  activityLabel: string;
  reason: "copied_hint" | "keyword_dump" | "too_short" | "missing_concepts" | "unlinked_concepts";
  title: string;
  prompt: string;
  attempts: number;
  hintLevel: number;
  disputed: boolean;
  updatedAt: string;
};

export type LearningStorageWarning = {
  domain: string;
  code: "invalid_json" | "invalid_shape" | "write_failed";
  message: string;
};

export type LearningRepositorySnapshot = {
  lessons: Record<string, LessonProgress>;
  expansion: ExpansionProgress;
  diagnostic: DiagnosticResult | null;
  repairs: RepairItemSnapshot[];
  history: LocalLearningEvent[];
  adaptive: AdaptiveState;
  warnings: LearningStorageWarning[];
};

export type RepositoryWriteResult =
  | { ok: true }
  | { ok: false; warning: LearningStorageWarning };

export interface LearningRepository {
  readSnapshot(now?: Date): Promise<LearningRepositorySnapshot>;
  writeAdaptiveState(state: AdaptiveState): Promise<RepositoryWriteResult>;
}
```

Implement `normalizeAdaptiveState` with a 15-to-60-minute clamp, a valid-date check, string-only unique queue IDs capped at four, and the defaults used by the tests.

- [ ] **Step 4: Implement localStorage and in-memory repositories**

Use a private `safeJson` helper that returns `{ value, warning }`, then normalize each domain independently. For each R0 lesson, prefer `.progress.v3` and fall back to `.progress.v2`. For expansion progress, prefer v3 then v2 then v1. Parse repair and history arrays into bounded metadata-only shapes.

Expose:

```ts
export function createLocalStorageLearningRepository(storage: StorageLike): LearningRepository;

export function createMemoryLearningRepository(
  snapshot: LearningRepositorySnapshot,
): LearningRepository;
```

The memory implementation returns `structuredClone(snapshot)` and updates only its private adaptive state.

- [ ] **Step 5: Run repository tests**

```bash
node --test tests/learning-repository.test.mjs
```

Expected: all repository tests PASS.

- [ ] **Step 6: Commit the repository boundary**

```bash
git add lib/learning-repository.ts tests/learning-repository.test.mjs
git commit -m "feat: add learning repository boundary"
```

### Task 4: Project R0-R4 state into concept evidence

**Files:**
- Create: `lib/concept-evidence.ts`
- Create: `tests/concept-evidence.test.mjs`

**Interfaces:**
- Consumes: `LearningRepositorySnapshot`, `lessonCatalog`, `expansionLabs`, `prerequisiteEdges`.
- Produces:
  - `EvidenceGate`
  - `ConceptSnapshot`
  - `projectConceptEvidence(repositorySnapshot, now)`

- [ ] **Step 1: Write failing evidence-projection tests**

Create `tests/concept-evidence.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { projectConceptEvidence } from "../lib/concept-evidence.ts";
import { createMemoryLearningRepository } from "../lib/learning-repository.ts";
import { emptyExpansionProgress } from "../lib/expansion-progress.ts";

const now = new Date("2026-09-05T00:00:00.000Z");

function baseSnapshot(overrides = {}) {
  return {
    lessons: {},
    expansion: emptyExpansionProgress,
    diagnostic: null,
    repairs: [],
    history: [],
    adaptive: { schemaVersion: 1, sessionMinutes: 30, lastGeneratedAt: null, lastQueueIds: [] },
    warnings: [],
    ...overrides,
  };
}

test("R0 evidence maps five activities into practice, variant, transfer and delayed gates", async () => {
  const progress = {
    currentIndex: 5,
    completed: ["frame-predict", "frame-mechanism", "frame-explain", "frame-code", "frame-transfer"],
    attempts: { "frame-predict": 1, "frame-mechanism": 1, "frame-explain": 2, "frame-code": 1, "frame-transfer": 1 },
    hintLevels: { "frame-explain": 1 },
    activityEvidence: {
      "frame-predict": { completedAt: now.toISOString(), attempts: 1, hintsUsed: 0 },
      "frame-mechanism": { completedAt: now.toISOString(), attempts: 1, hintsUsed: 0 },
      "frame-explain": { completedAt: now.toISOString(), attempts: 2, hintsUsed: 1 },
      "frame-code": { completedAt: now.toISOString(), attempts: 1, hintsUsed: 0 },
      "frame-transfer": { completedAt: now.toISOString(), attempts: 1, hintsUsed: 0 },
    },
    practicedAt: now.toISOString(),
    review: { dueAt: now.toISOString(), completedAt: now.toISOString(), attempts: 1, correct: true },
  };
  const repo = createMemoryLearningRepository(baseSnapshot({ lessons: { "problem-frame": progress } }));
  const concepts = projectConceptEvidence(await repo.readSnapshot(now), now);
  const concept = concepts.find((item) => item.id === "problem-frame");
  assert.equal(concept.evidence.practice.status, "met");
  assert.equal(concept.evidence.variant.status, "met");
  assert.equal(concept.evidence.transfer.status, "met");
  assert.equal(concept.evidence.delayed.status, "met");
  assert.equal(concept.totalHints, 1);
  assert.equal(concept.totalAttempts, 6);
});

test("expansion projection preserves current mastery and reports blocked outgoing edges separately", () => {
  const snapshot = baseSnapshot({
    expansion: {
      ...emptyExpansionProgress,
      completedLabIds: ["logic-truth-table"],
      attempts: { "logic-truth-table": 1 },
      completedAt: { "logic-truth-table": "2026-09-01T00:00:00.000Z" },
      reviews: { "logic-truth-table": { dueAt: "2026-09-04T00:00:00.000Z", attempts: 1, passedAt: "2026-09-04T00:00:00.000Z" } },
    },
  });
  const concepts = projectConceptEvidence(snapshot, now);
  const logic = concepts.find((item) => item.id === "logic-truth-table");
  assert.equal(logic.evidence.practice.status, "met");
  assert.equal(logic.evidence.delayed.status, "met");
  assert.deepEqual(logic.blockedOutgoingEdgeIds, ["logic-to-conditional"]);
});
```

- [ ] **Step 2: Run the focused test and confirm module-not-found**

```bash
node --test tests/concept-evidence.test.mjs
```

Expected: FAIL because `lib/concept-evidence.ts` does not exist.

- [ ] **Step 3: Define evidence and concept types**

Create `lib/concept-evidence.ts` with these public types:

```ts
export type EvidenceGate = {
  status: "met" | "missing" | "not_applicable";
  completedAt: string | null;
  attempts: number;
  hintsUsed: number;
};

export type ConceptSnapshot = {
  id: string;
  title: string;
  trackId: "r0" | "r1-math" | "r2-sql-algorithms" | "r3-machine-learning" | "r4-deep-learning-llm";
  prerequisites: string[];
  evidence: {
    practice: EvidenceGate;
    variant: EvidenceGate;
    transfer: EvidenceGate;
    delayed: EvidenceGate;
  };
  totalAttempts: number;
  totalHints: number;
  unresolvedMisconceptions: number;
  lastPracticedAt: string | null;
  nextReviewAt: string | null;
  blockedOutgoingEdgeIds: string[];
};
```

- [ ] **Step 4: Implement the R0 and expansion projections**

Implement:

```ts
export function projectConceptEvidence(
  snapshot: LearningRepositorySnapshot,
  now = new Date(),
): ConceptSnapshot[];
```

Rules:

- R0 practice uses activities at indexes 0 and 1; variant uses index 2; transfer uses indexes 3 and 4; delayed uses `review.correct && review.completedAt`.
- A gate requiring multiple activities is `met` only when all required activity IDs are completed.
- R0 attempts and hints sum the `activityEvidence` values, falling back to legacy maps.
- Expansion practice uses `completedLabIds`; delayed uses `reviews[labId].passedAt`.
- Expansion variant and transfer are `not_applicable` for current lab definitions; prerequisite-edge evidence remains in `blockedOutgoingEdgeIds` so current mastery is not silently downgraded.
- A repair item increments `unresolvedMisconceptions` for its lesson.
- Return R0 concepts in catalog order followed by expansion concepts in catalog order.
- Do not mutate the repository snapshot.

- [ ] **Step 5: Run focused tests and verify determinism**

```bash
node --test tests/concept-evidence.test.mjs
node --test tests/mastery.test.mjs tests/expansion-progress.test.mjs
```

Expected: all tests PASS.

- [ ] **Step 6: Commit concept evidence projection**

```bash
git add lib/concept-evidence.ts tests/concept-evidence.test.mjs
git commit -m "feat: unify R0 to R4 concept evidence"
```

### Task 5: Compute deterministic mastery states and learning risks

**Files:**
- Create: `lib/adaptive-mastery.ts`
- Create: `tests/adaptive-mastery.test.mjs`

**Interfaces:**
- Consumes: `ConceptSnapshot`.
- Produces:
  - `AdaptiveMasteryState`
  - `LearningRiskFlag`
  - `AdaptiveConceptState`
  - `evaluateAdaptiveMastery(concept, now)`

- [ ] **Step 1: Write failing mastery and risk tests**

Create `tests/adaptive-mastery.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { evaluateAdaptiveMastery } from "../lib/adaptive-mastery.ts";

const missing = { status: "missing", completedAt: null, attempts: 0, hintsUsed: 0 };
const met = (completedAt = "2026-09-01T00:00:00.000Z", attempts = 1, hintsUsed = 0) => ({
  status: "met", completedAt, attempts, hintsUsed,
});

function concept(overrides = {}) {
  return {
    id: "vectors",
    title: "Vector và dot product",
    trackId: "r0",
    prerequisites: [],
    evidence: { practice: missing, variant: missing, transfer: missing, delayed: missing },
    totalAttempts: 0,
    totalHints: 0,
    unresolvedMisconceptions: 0,
    lastPracticedAt: null,
    nextReviewAt: null,
    blockedOutgoingEdgeIds: [],
    ...overrides,
  };
}

test("mastery follows evidence gates and an injected clock", () => {
  const now = new Date("2026-09-05T00:00:00.000Z");
  assert.equal(evaluateAdaptiveMastery(concept(), now).state, "unexplored");
  assert.equal(evaluateAdaptiveMastery(concept({ evidence: { practice: met(), variant: missing, transfer: missing, delayed: missing } }), now).state, "learning");
  assert.equal(evaluateAdaptiveMastery(concept({ evidence: { practice: met(), variant: met(), transfer: met(), delayed: missing }, nextReviewAt: "2026-09-06T00:00:00.000Z" }), now).state, "practiced");
  assert.equal(evaluateAdaptiveMastery(concept({ evidence: { practice: met(), variant: met(), transfer: met(), delayed: missing }, nextReviewAt: "2026-09-04T00:00:00.000Z" }), now).state, "review_due");
  assert.equal(evaluateAdaptiveMastery(concept({ evidence: { practice: met(), variant: met(), transfer: met(), delayed: met() } }), now).state, "mastered");
});

test("risk flags are orthogonal and do not erase completion", () => {
  const result = evaluateAdaptiveMastery(concept({
    evidence: { practice: met(undefined, 3, 1), variant: met(), transfer: met(), delayed: met("2026-08-01T00:00:00.000Z") },
    totalAttempts: 6,
    totalHints: 1,
    unresolvedMisconceptions: 2,
    blockedOutgoingEdgeIds: ["vectors-to-transform"],
  }), new Date("2026-09-05T00:00:00.000Z"));
  assert.equal(result.state, "mastered");
  assert.deepEqual(result.risks.sort(), ["hint_dependent", "misconception_open", "prerequisite_blocked", "retry_heavy", "stale"]);
});
```

- [ ] **Step 2: Run the focused test and confirm module-not-found**

```bash
node --test tests/adaptive-mastery.test.mjs
```

Expected: FAIL because `lib/adaptive-mastery.ts` does not exist.

- [ ] **Step 3: Implement the pure mastery evaluator**

Create `lib/adaptive-mastery.ts`:

```ts
import type { ConceptSnapshot, EvidenceGate } from "./concept-evidence";

export type AdaptiveMasteryState = "unexplored" | "learning" | "practiced" | "review_due" | "mastered";
export type LearningRiskFlag = "hint_dependent" | "retry_heavy" | "misconception_open" | "stale" | "prerequisite_blocked";

export type AdaptiveConceptState = ConceptSnapshot & {
  state: AdaptiveMasteryState;
  risks: LearningRiskFlag[];
};

const gateSatisfied = (gate: EvidenceGate) => gate.status !== "missing";

export function evaluateAdaptiveMastery(
  concept: ConceptSnapshot,
  now = new Date(),
): AdaptiveConceptState;
```

Rules:

- `unexplored`: no applicable evidence gate is met.
- `learning`: at least one applicable gate is met but practice, variant, or transfer remains missing.
- `practiced`: all non-delayed applicable gates are met and delayed evidence is missing but not due.
- `review_due`: all non-delayed applicable gates are met, delayed evidence is missing, and `nextReviewAt <= now`.
- `mastered`: every applicable evidence gate is met.
- `hint_dependent`: `totalHints > 0`.
- `retry_heavy`: `totalAttempts >= 3`.
- `misconception_open`: `unresolvedMisconceptions > 0`.
- `prerequisite_blocked`: `blockedOutgoingEdgeIds.length > 0`.
- `stale`: state is mastered and delayed completion is more than 21 days before `now`.

Use unique risk flags in the order declared by `LearningRiskFlag` above.

- [ ] **Step 4: Run focused and legacy mastery tests**

```bash
node --test tests/adaptive-mastery.test.mjs tests/mastery.test.mjs
```

Expected: all tests PASS; existing lesson mastery behavior remains intact.

- [ ] **Step 5: Commit adaptive mastery**

```bash
git add lib/adaptive-mastery.ts tests/adaptive-mastery.test.mjs
git commit -m "feat: evaluate adaptive mastery risks"
```

### Task 6: Build the explainable Today Queue policy

**Files:**
- Create: `lib/today-queue.ts`
- Create: `tests/today-queue.test.mjs`

**Interfaces:**
- Consumes: `AdaptiveConceptState`, `RepairItemSnapshot`, `prerequisiteEdges`.
- Produces:
  - `LearningTarget`
  - `TodayQueueItem`
  - `TodayQueueInput`
  - `buildTodayQueue(input)`

- [ ] **Step 1: Write failing priority, tie-break, and budget tests**

Create `tests/today-queue.test.mjs` with helpers that build minimal adaptive concepts, then add:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { buildTodayQueue } from "../lib/today-queue.ts";

test("due review outranks novelty and explains the evidence", () => {
  const queue = buildTodayQueue({
    now: new Date("2026-09-05T00:00:00.000Z"),
    budgetMinutes: 30,
    concepts: [
      concept({ id: "probability-bayes", title: "Bayes", state: "review_due", nextReviewAt: "2026-09-03T00:00:00.000Z", totalHints: 2 }),
      concept({ id: "ml-threshold", title: "Threshold", state: "unexplored" }),
    ],
    repairs: [],
  });
  assert.equal(queue.items[0].type, "review");
  assert.equal(queue.items[0].target.id, "probability-bayes");
  assert.match(queue.items[0].reason, /quá hạn 2 ngày/);
  assert.match(queue.items[0].reason, /gợi ý/);
  assert.equal(queue.totalMinutes <= 30, true);
});

test("critical repair outranks non-due novelty", () => {
  const queue = buildTodayQueue({
    now: new Date("2026-09-05T00:00:00.000Z"),
    budgetMinutes: 30,
    concepts: [concept({ id: "vectors", state: "learning", unresolvedMisconceptions: 3 })],
    repairs: [{
      id: "vectors:vec-explain",
      lessonId: "vectors",
      activityId: "vec-explain",
      lessonTitle: "Vector và dot product",
      activityLabel: "Feynman explanation",
      reason: "unlinked_concepts",
      title: "Nối cơ chế",
      prompt: "Giải thích vì sao",
      attempts: 3,
      hintLevel: 2,
      disputed: true,
      updatedAt: "2026-09-04T00:00:00.000Z",
    }],
  });
  assert.equal(queue.items[0].type, "repair");
  assert.equal(queue.items[0].score >= 25, true);
});

test("identical inputs and clocks produce stable lexical tie-breaking", () => {
  const input = {
    now: new Date("2026-09-05T00:00:00.000Z"),
    budgetMinutes: 30,
    concepts: [concept({ id: "b", state: "unexplored" }), concept({ id: "a", state: "unexplored" })],
    repairs: [],
  };
  assert.deepEqual(buildTodayQueue(input), buildTodayQueue(input));
  assert.equal(buildTodayQueue(input).items.find((item) => item.type === "new")?.target.id, "a");
});
```

The local `concept` helper must include all `AdaptiveConceptState` fields and accept partial overrides. Repair fixtures must include every required `RepairItemSnapshot` field.

- [ ] **Step 2: Run the focused test and confirm module-not-found**

```bash
node --test tests/today-queue.test.mjs
```

Expected: FAIL because `lib/today-queue.ts` does not exist.

- [ ] **Step 3: Define queue targets and items**

Create `lib/today-queue.ts` with:

```ts
export type LearningTarget =
  | { kind: "lesson"; id: string; activityId: string | null; mode: "practice" | "review" }
  | { kind: "expansion"; id: ExpansionLabId; mode: "practice" | "review" };

export type TodayQueueItem = {
  id: string;
  type: "review" | "repair" | "bridge" | "practice" | "new" | "reflection";
  title: string;
  trackId: string;
  minutes: number;
  score: number;
  reason: string;
  evidenceNeeded: string;
  target: LearningTarget | null;
};

export type TodayQueueInput = {
  concepts: AdaptiveConceptState[];
  repairs: RepairItemSnapshot[];
  now?: Date;
  budgetMinutes?: number;
};

export type TodayQueue = {
  generatedAt: string;
  budgetMinutes: number;
  totalMinutes: number;
  items: TodayQueueItem[];
};
```

- [ ] **Step 4: Implement bounded score components**

Implement pure helpers with these exact ranges:

```ts
const dueScore = (overdueHours: number) => Math.min(40, 30 + Math.floor(Math.max(0, overdueHours) / 24));
const misconceptionScore = (attempts: number, disputed: boolean) => Math.min(25, 15 + Math.max(0, attempts - 1) * 5 + (disputed ? 5 : 0));
const prerequisiteScore = (blockedEdgeCount: number) => Math.min(15, blockedEdgeCount * 5);
const assistanceScore = (hints: number, attempts: number) => Math.min(10, Math.min(6, hints * 3) + (attempts >= 3 ? 4 : 0));
const freshnessScore = (state: AdaptiveMasteryState) => state === "unexplored" ? 10 : state === "learning" ? 5 : 0;
```

Candidate score is the sum of the five components. A repair candidate derives misconception and assistance values from its repair record and owning concept. A bridge candidate is created for the first blocked outgoing edge of a practiced or mastered concept and targets the edge destination expansion lab.

- [ ] **Step 5: Implement session selection and Vietnamese reasons**

Implement `buildTodayQueue` with these ordered slots:

1. highest due `review`, if any, at five minutes;
2. highest `repair` or `bridge`, if any, at eight minutes;
3. highest `practice` or `new`, if any, at fourteen minutes;
4. a three-minute `reflection` only when another item exists.

Do not exceed the clamped 15-to-60-minute budget. Within each slot sort by score descending, oldest due timestamp ascending, blocked-edge count descending, then item ID with `localeCompare("en")`.

Reasons must mention the decisive evidence, not the numeric score. Use deterministic templates:

```ts
`Ôn ${title} trước vì bài đã quá hạn ${days} ngày${hintSuffix}.`
`Sửa ${title} vì cùng một mắt xích đã vướng ${attempts} lần${disputeSuffix}.`
`Làm cầu nối này để mở ${destinationTitle}.`
`Tiếp tục ${title} vì bằng chứng ${missingGateLabel} còn thiếu.`
`Bắt đầu ${title} vì đây là prerequisite có giá trị mở khóa cao nhất.`
```

- [ ] **Step 6: Run queue and projection tests**

```bash
node --test tests/today-queue.test.mjs tests/concept-evidence.test.mjs tests/adaptive-mastery.test.mjs
```

Expected: all tests PASS.

- [ ] **Step 7: Commit Today Queue policy**

```bash
git add lib/today-queue.ts tests/today-queue.test.mjs
git commit -m "feat: rank explainable daily learning actions"
```

### Task 7: Persist adaptive preferences through Learning Passport

**Files:**
- Modify: `lib/learning-backup.ts`
- Modify: `tests/learning-backup.test.mjs`

**Interfaces:**
- Consumes: `ADAPTIVE_STATE_KEY`, `AdaptiveState`, existing backup schema 1.
- Produces: backup allowlisting, validation, summary flag `hasAdaptiveState`, and rollback coverage for the new key.

- [ ] **Step 1: Add failing adaptive backup tests**

Add `briliantai.adaptive-state.v1` to the export fixture and assert:

```js
assert.deepEqual(Object.keys(backup.data), [
  "briliantai.adaptive-state.v1",
  "briliantai.diagnostic.v1",
  "briliantai.expansion-progress.v3",
  "briliantai.lesson.vectors.progress.v3",
  "briliantai.repair-queue.v1",
]);
assert.equal(summary.hasAdaptiveState, true);
```

Add a validation case:

```js
assert.throws(() => parseLearningBackupText(JSON.stringify({
  ...validHeader,
  data: { "briliantai.adaptive-state.v1": JSON.stringify({ schemaVersion: 2 }) },
})), /adaptive state không hợp lệ/i);
```

Add the adaptive key to the failed-restore fixture and assert that its previous value is restored after the simulated write failure.

- [ ] **Step 2: Run focused tests and confirm failure**

```bash
node --test tests/learning-backup.test.mjs
```

Expected: FAIL because the key is not allowlisted and the summary has no adaptive flag.

- [ ] **Step 3: Allowlist and validate adaptive state**

In `lib/learning-backup.ts`:

```ts
import { ADAPTIVE_STATE_KEY, normalizeAdaptiveState } from "./learning-repository";
```

Add `ADAPTIVE_STATE_KEY` to `EXACT_KEYS`, add `hasAdaptiveState: boolean` to `LearningBackupSummary`, and validate the adaptive payload during `parseLearningBackupText`:

```ts
if (key === ADAPTIVE_STATE_KEY) {
  const parsed = JSON.parse(value) as { schemaVersion?: unknown };
  if (parsed.schemaVersion !== 1) throw new Error("Adaptive state không hợp lệ.");
  normalizeAdaptiveState(parsed);
}
```

Return `hasAdaptiveState: keys.includes(ADAPTIVE_STATE_KEY)` from `summarizeLearningBackup`.

- [ ] **Step 4: Run backup and repository tests**

```bash
node --test tests/learning-backup.test.mjs tests/learning-repository.test.mjs
```

Expected: all tests PASS.

- [ ] **Step 5: Commit portable adaptive preferences**

```bash
git add lib/learning-backup.ts tests/learning-backup.test.mjs
git commit -m "feat: include adaptive state in learning passport"
```

### Task 8: Build accessible Today Session and Mastery Summary components

**Files:**
- Create: `components/learning/today-session.tsx`
- Create: `components/learning/mastery-summary.tsx`
- Create: `tests/adaptive-hub.test.mjs`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `TodayQueue`, `TodayQueueItem`, `AdaptiveConceptState`.
- Produces:
  - `TodaySession({ queue, onOpen })`
  - `MasterySummary({ concepts })`
  - CSS classes prefixed with `.today-` and `.mastery-pulse`.

- [ ] **Step 1: Add failing component-contract tests**

Create `tests/adaptive-hub.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Today Session exposes reasons, evidence and semantic progress", async () => {
  const source = await readFile(new URL("../components/learning/today-session.tsx", import.meta.url), "utf8");
  assert.match(source, /TODAY \/ 30 PHÚT/);
  assert.match(source, /Vì sao chọn bài này/);
  assert.match(source, /item\.reason/);
  assert.match(source, /item\.evidenceNeeded/);
  assert.match(source, /aria-label=/);
  assert.match(source, /aria-current=/);
});

test("Mastery Summary names every actionable state", async () => {
  const source = await readFile(new URL("../components/learning/mastery-summary.tsx", import.meta.url), "utf8");
  assert.match(source, /Ổn định/);
  assert.match(source, /Đến hạn/);
  assert.match(source, /Cần sửa/);
  assert.match(source, /Bị khóa/);
});

test("adaptive cards retain brutalist contrast, readable type and touch targets", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.today-session\s*{[^}]*background:\s*var\(--on-surface\)/s);
  assert.match(css, /\.today-session\s*{[^}]*color:\s*var\(--on-dark\)/s);
  assert.match(css, /\.today-action\s*{[^}]*min-height:\s*64px/s);
  assert.match(css, /\.today-reason\s*{[^}]*font-size:\s*12px/s);
  assert.match(css, /\.today-session \.queue-empty strong\s*{[^}]*color:\s*var\(--on-dark\)/s);
  assert.match(css, /\.mastery-pulse/);
});
```

- [ ] **Step 2: Run the focused test and confirm missing files**

```bash
node --test tests/adaptive-hub.test.mjs
```

Expected: FAIL with `ENOENT` for the first missing component.

- [ ] **Step 3: Implement `TodaySession`**

Create `components/learning/today-session.tsx`:

```tsx
"use client";

import type { TodayQueue, TodayQueueItem } from "../../lib/today-queue";

export function TodaySession({
  queue,
  onOpen,
}: {
  queue: TodayQueue;
  onOpen: (item: TodayQueueItem) => void;
}) {
  return (
    <section className="today-session" aria-labelledby="today-session-title">
      <header>
        <div>
          <span className="mono-label">TODAY / 30 PHÚT</span>
          <h2 id="today-session-title">Phiên học có chủ đích</h2>
        </div>
        <strong aria-label={`${queue.totalMinutes} trên ${queue.budgetMinutes} phút`}>
          {queue.totalMinutes}/{queue.budgetMinutes} phút
        </strong>
      </header>
      {queue.items.length ? (
        <ol className="today-actions">
          {queue.items.map((item, index) => (
            <li key={item.id}>
              <button
                className="today-action"
                aria-current={index === 0 ? "step" : undefined}
                aria-label={`${index + 1}. ${item.title}. ${item.reason}`}
                disabled={!item.target}
                onClick={() => item.target && onOpen(item)}
              >
                <span className="today-order">{String(index + 1).padStart(2, "0")}</span>
                <span>
                  <small>{item.type} · {item.minutes} phút</small>
                  <strong>{item.title}</strong>
                  <span className="today-reason"><b>Vì sao chọn bài này:</b> {item.reason}</span>
                  <span className="today-evidence">Bằng chứng cần tạo: {item.evidenceNeeded}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <div className="queue-empty"><strong>Chưa có hành động phù hợp.</strong><p>Hoàn thành diagnostic để hệ thống tìm điểm bắt đầu.</p></div>
      )}
    </section>
  );
}
```

Keep the reflection item disabled and semantically readable because it has no runtime target.

- [ ] **Step 4: Implement `MasterySummary`**

Create `components/learning/mastery-summary.tsx`:

```tsx
import type { AdaptiveConceptState } from "../../lib/adaptive-mastery";

export function MasterySummary({ concepts }: { concepts: AdaptiveConceptState[] }) {
  const metrics = [
    { label: "Ổn định", value: concepts.filter((item) => item.state === "mastered" && !item.risks.includes("stale")).length },
    { label: "Đến hạn", value: concepts.filter((item) => item.state === "review_due" || item.risks.includes("stale")).length },
    { label: "Cần sửa", value: concepts.filter((item) => item.risks.includes("misconception_open")).length },
    { label: "Bị khóa", value: concepts.filter((item) => item.risks.includes("prerequisite_blocked")).length },
  ];
  return (
    <section className="mastery-pulse" aria-labelledby="mastery-pulse-title">
      <div><span className="mono-label">MASTERY PULSE</span><h2 id="mastery-pulse-title">Sức khỏe kiến thức</h2></div>
      <dl>{metrics.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>
    </section>
  );
}
```

- [ ] **Step 5: Add brutalist component styles**

Add a bounded section to `app/globals.css`:

```css
.today-session { margin-bottom: 24px; padding: 24px; color: var(--on-dark); background: var(--on-surface); border: 3px solid var(--on-surface); box-shadow: var(--hard-shadow); }
.today-session > header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }
.today-session h2 { margin: 6px 0 0; font-size: 28px; line-height: 1.15; }
.today-session .mono-label { color: var(--secondary-container); }
.today-actions { margin: 22px 0 0; padding: 0; list-style: none; display: grid; gap: 10px; }
.today-action { width: 100%; min-height: 64px; padding: 14px; border: 2px solid var(--on-dark); color: var(--on-surface); background: var(--surface-lowest); display: grid; grid-template-columns: 42px 1fr; gap: 12px; text-align: left; cursor: pointer; }
.today-action[aria-current="step"] { background: var(--secondary-container); }
.today-action:disabled { cursor: default; opacity: .82; }
.today-action > span:last-child { display: grid; gap: 4px; }
.today-order { font: 700 15px/1 "IBM Plex Mono", monospace; }
.today-action small, .today-evidence { font-size: 12px; }
.today-reason { font-size: 12px; line-height: 1.45; }
.today-evidence { color: var(--on-surface-variant); }
.today-session .queue-empty { color: var(--on-dark); border-color: var(--on-dark); }
.today-session .queue-empty strong { color: var(--on-dark); }
.mastery-pulse { margin-bottom: 24px; padding: 20px 24px; border: 3px solid var(--on-surface); background: var(--surface-lowest); display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 24px; }
.mastery-pulse h2 { margin: 5px 0 0; font-size: 22px; }
.mastery-pulse dl { margin: 0; display: grid; grid-template-columns: repeat(4, minmax(74px, 1fr)); gap: 8px; }
.mastery-pulse dl > div { padding: 10px; border: 2px solid var(--on-surface); text-align: center; }
.mastery-pulse dt { font-size: 12px; }
.mastery-pulse dd { margin: 4px 0 0; font: 700 24px/1 "IBM Plex Mono", monospace; }
```

Add mobile rules inside the existing responsive breakpoint so `.today-session > header` and `.mastery-pulse` become one column, while `.mastery-pulse dl` uses two columns.

- [ ] **Step 6: Run component and design tests**

```bash
node --test tests/adaptive-hub.test.mjs tests/design.test.mjs
```

Expected: all tests PASS.

- [ ] **Step 7: Commit adaptive Hub components**

```bash
git add components/learning/today-session.tsx components/learning/mastery-summary.tsx app/globals.css tests/adaptive-hub.test.mjs
git commit -m "feat: add adaptive Today session UI"
```

### Task 9: Hydrate adaptive state and integrate it into the Learning Hub

**Files:**
- Create: `components/learning/adaptive-hub.tsx`
- Modify: `app/learning-dashboard.tsx`
- Modify: `tests/adaptive-hub.test.mjs`
- Modify: `tests/deployment-reliability.test.mjs`
- Modify: `tests/rendered-html.test.mjs`

**Interfaces:**
- Consumes: repository, evidence projection, adaptive mastery, Today Queue, and route callbacks.
- Produces:
  - `AdaptiveHubState`
  - `useAdaptiveHubState(revision)`
  - `AdaptiveHub({ state, onLesson, onExpansion })`
  - route dispatch from `TodayQueueItem.target` to existing runtimes.

- [ ] **Step 1: Add failing hydration and integration tests**

Append to `tests/adaptive-hub.test.mjs`:

```js
test("AdaptiveHub hydrates local state after mount and routes by target kind", async () => {
  const source = await readFile(new URL("../components/learning/adaptive-hub.tsx", import.meta.url), "utf8");
  assert.match(source, /useState<AdaptiveHubState>\(initialAdaptiveHubState\)/);
  assert.match(source, /useEffect\(\(\) =>/);
  assert.match(source, /createLocalStorageLearningRepository\(window\.localStorage\)/);
  assert.match(source, /projectConceptEvidence/);
  assert.match(source, /evaluateAdaptiveMastery/);
  assert.match(source, /buildTodayQueue/);
  assert.match(source, /target\.kind === "lesson"/);
  assert.match(source, /target\.kind === "expansion"/);
});

test("dashboard uses the adaptive Hub boundary instead of four direct storage hooks", async () => {
  const source = await readFile(new URL("../app/learning-dashboard.tsx", import.meta.url), "utf8");
  assert.match(source, /useAdaptiveHubState\(masteryRevision\)/);
  assert.match(source, /<AdaptiveHub/);
  assert.doesNotMatch(source, /function useMasterySnapshot/);
  assert.doesNotMatch(source, /function useRepairItems/);
  assert.doesNotMatch(source, /function useExpansionProgressSnapshot/);
  assert.doesNotMatch(source, /function useLocalLearningHistory/);
});
```

Update `tests/deployment-reliability.test.mjs` to assert local learning state is restored in `AdaptiveHub` inside an effect and not in a `useState` initializer.

Update `tests/rendered-html.test.mjs` to expect `Phiên học có chủ đích` and `Sức khỏe kiến thức` in built HTML.

- [ ] **Step 2: Run focused tests and confirm missing integration**

```bash
node --test tests/adaptive-hub.test.mjs tests/deployment-reliability.test.mjs
```

Expected: FAIL because `adaptive-hub.tsx` is missing and dashboard still owns direct storage hooks.

- [ ] **Step 3: Implement `AdaptiveHub` hydration and fallback**

Create `components/learning/adaptive-hub.tsx` with:

```ts
export type AdaptiveHubState = {
  hydrated: boolean;
  concepts: AdaptiveConceptState[];
  queue: TodayQueue;
  repositorySnapshot: LearningRepositorySnapshot | null;
  warning: string | null;
};

export const initialAdaptiveHubState: AdaptiveHubState = {
  hydrated: false,
  concepts: [],
  queue: { generatedAt: "", budgetMinutes: 30, totalMinutes: 0, items: [] },
  repositorySnapshot: null,
  warning: null,
};
```

Implement `useAdaptiveHubState(revision: number)`. Inside its `useEffect`, create the localStorage repository, call `readSnapshot(new Date())`, project evidence, evaluate mastery, build the queue, persist `{ schemaVersion: 1, sessionMinutes, lastGeneratedAt, lastQueueIds }`, and update state. Use a cancellation boolean in cleanup so a stale promise cannot set state after unmount.

If repository read or queue computation rejects, set `hydrated: true`, keep an empty queue, and show:

```text
Không thể đọc đầy đủ tiến độ cục bộ. Hàng ôn hiện có vẫn dùng được; hãy xuất Learning Passport trước khi xóa dữ liệu trình duyệt.
```

`AdaptiveHub` always renders `TodaySession` and `MasterySummary` from the supplied state. Before hydration, it renders the same empty component shells inside a wrapper with `aria-busy="true"`; this keeps server and initial client HTML identical while retaining both headings in built HTML.

- [ ] **Step 4: Implement target routing**

Use one internal handler:

```ts
const openQueueItem = (item: TodayQueueItem) => {
  const target = item.target;
  if (!target) return;
  if (target.kind === "lesson") {
    onLesson(target.id, target.activityId, target.mode);
    return;
  }
  onExpansion(target.id, target.mode === "review");
};
```

Props must be:

```ts
{
  state: AdaptiveHubState;
  onLesson: (lessonId: string, activityId: string | null, mode: "practice" | "review") => void;
  onExpansion: (labId: ExpansionLabId, reviewDue: boolean) => void;
}
```

- [ ] **Step 5: Integrate AdaptiveHub and remove duplicate Hub storage hooks**

In `app/learning-dashboard.tsx`:

- import `AdaptiveHub`, `useAdaptiveHubState`, and repository snapshot types;
- remove `useMasterySnapshot`, `useRepairItems`, `useLocalLearningHistory`, and `useExpansionProgressSnapshot`;
- remove the separate diagnostic hydration effect; use `adaptive.repositorySnapshot?.diagnostic ?? null`;
- keep lesson runtime persistence unchanged;
- derive lesson snapshots, expansion progress, repairs, history, and diagnostic from `adaptive.repositorySnapshot`, with the existing empty defaults before hydration;
- place `AdaptiveHub` immediately after the Learning Hub page header and before `DiagnosticSummary`;
- map lesson queue targets to `openLesson`, including `activityId` for repair items;
- map expansion review targets to `openExpansionItem`;
- increment `masteryRevision` after lesson close, diagnostic completion, expansion return, and Passport restore.

The render shape must be equivalent to:

```tsx
const adaptive = useAdaptiveHubState(masteryRevision);
const repositorySnapshot = adaptive.repositorySnapshot;

<HubView
  adaptive={adaptive}
  snapshots={toLessonSnapshots(repositorySnapshot?.lessons ?? {})}
  expansionProgress={repositorySnapshot?.expansion ?? emptyExpansionProgress}
  repairs={repositorySnapshot?.repairs ?? []}
  history={repositorySnapshot?.history ?? []}
  diagnostic={repositorySnapshot?.diagnostic ?? null}
  onAdaptiveLesson={(lessonId, activityId) => openLesson(lessonId, activityId)}
  onExpansion={openExpansionItem}
  {...hubCallbacks}
/>
```

Inside `HubView`, render:

```tsx
<header className="template-page-header">...</header>
<AdaptiveHub state={adaptive} onLesson={onAdaptiveLesson} onExpansion={onExpansion} />
<DiagnosticSummary ... />
```

Do not move Socratic Lab or Expansion Workbench state into the new component.

- [ ] **Step 6: Run focused integration tests**

```bash
node --test tests/adaptive-hub.test.mjs tests/deployment-reliability.test.mjs tests/learning-repository.test.mjs tests/today-queue.test.mjs
```

Expected: all focused tests PASS.

- [ ] **Step 7: Run the production build and rendered HTML test**

```bash
npm run build
node --test tests/rendered-html.test.mjs
```

Expected: production build PASS; built HTML contains both adaptive Hub markers.

- [ ] **Step 8: Commit Hub integration**

```bash
git add components/learning/adaptive-hub.tsx app/learning-dashboard.tsx tests/adaptive-hub.test.mjs tests/deployment-reliability.test.mjs tests/rendered-html.test.mjs
git commit -m "feat: drive the Hub from adaptive evidence"
```

### Task 10: Close release gates, document the architecture, and publish

**Files:**
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/ROADMAP.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: all prior tasks and the existing Sites project.
- Produces: verified documentation, complete QA evidence, and a terminal successful production deployment from the exact tested commit.

- [ ] **Step 1: Update architecture documentation**

Add a new `## Adaptive mastery boundary` section to `docs/ARCHITECTURE.md` containing:

```markdown
## Adaptive mastery boundary

- `LearningRepository` is the only Hub boundary allowed to read versioned browser state.
- Existing R0 and R1-R4 progress keys remain the canonical evidence stores.
- Concept projection is immutable and contains no raw learner answers, code, stdout, or personal text.
- Adaptive mastery uses explicit evidence gates plus orthogonal risk flags.
- Today Queue ranking is deterministic for the same repository snapshot and injected clock.
- Every recommended action exposes its reason and required evidence.
- Storage or queue failure degrades to a recoverable warning and never grants mastery.
```

- [ ] **Step 2: Update roadmap and README**

In `docs/ROADMAP.md`, mark the foundation complete only after all tests pass, and set the next milestone to `Misconception Error Clinic`.

In `README.md`, add a short `Adaptive session` paragraph explaining that the Hub selects review, repair, bridge, and new-practice actions from local evidence and does not use AI to grant mastery.

- [ ] **Step 3: Run self-review scans**

```bash
rg -n "FIXME|lorem ipsum" app components lib tests docs/ARCHITECTURE.md docs/ROADMAP.md README.md
rg -n "localStorage" components/learning app/learning-dashboard.tsx
git diff --check
```

Expected:

- no unfinished or sample-only copy;
- direct Hub reads appear only inside `lib/learning-repository.ts`; lesson runtime writes may remain in `learning-dashboard.tsx`;
- no whitespace errors.

- [ ] **Step 4: Run every automated release gate**

```bash
npm run lint
npm test
```

Expected: lint PASS; authoring audit PASS; production build PASS; every test PASS.

- [ ] **Step 5: Perform the approved browser QA matrix**

Use `sites:sites-preview-troubleshooting` only if preview startup fails, and `control-browser` before any browser action. Start the supervised Site preview, then verify:

| Viewport | Scenario | Pass condition |
|---|---|---|
| 1440x900 | Empty state | Stable hydration; diagnostic CTA; no console error |
| 1440x900 | Populated R0-R4 state | Today Queue order matches fixture; reasons visible |
| 390x844 | Populated state | No horizontal overflow; actions at least 44px |
| 390x844 | Keyboard path | Focus visible; first action opens correct runtime |
| Both | Dark surfaces | No black-on-black or dark-on-dark learner text |
| Both | Storage failure fixture | Warning visible; existing learning flow remains usable |

Capture defects as failing automated regressions before fixing them. Stop the supervised preview after QA and before final handoff.

- [ ] **Step 6: Commit the release documentation**

```bash
git add docs/ARCHITECTURE.md docs/ROADMAP.md README.md
git commit -m "docs: close adaptive mastery foundation"
git status --short
git rev-parse HEAD
```

Expected: clean source state after commit.

- [ ] **Step 7: Re-run release gates on the documentation commit**

```bash
npm run lint
npm test
git status --short
git rev-parse HEAD
```

Expected: all gates PASS and the source tree is clean at the commit that will be published.

- [ ] **Step 8: Push, package, save, and deploy the exact commit**

Follow `sites:sites-hosting`:

1. obtain a short-lived repository credential for the existing project;
2. push exact `HEAD` to `main` using per-command authentication;
3. package the production artifact from that commit;
4. save a Site version using the exact `commit_sha`;
5. deploy that saved version to the existing access policy;
6. wait for terminal deployment status.

Expected: successful production deployment; saved version source SHA exactly matches local `HEAD`.

- [ ] **Step 9: Final production provenance check**

Use Sites to confirm:

- project ID remains `appgprj_6a8dd820e52081919d727df8547eeab7`;
- the live URL remains the current BriliantAI Lab URL;
- the latest version points to the tested commit;
- deployment status is terminal success.

Report the release outcome, test count, version number, commit SHA, and any browser-QA limitation. Do not claim learning-effectiveness targets have been met until the seven-day pilot supplies evidence.

## Execution checkpoints

- **Checkpoint A — after Task 2:** R4 and contrast corrections are live before adaptive changes begin.
- **Checkpoint B — after Task 6:** repository, evidence, mastery, and queue kernels are independently testable without React.
- **Checkpoint C — after Task 9:** the Learning Hub consumes the kernel and production build succeeds.
- **Checkpoint D — after Task 10:** browser QA and all release gates pass on the exact published commit.

## Plan self-review mapping

| Spec requirement | Implemented by |
|---|---|
| Production/source parity | Tasks 1-2 |
| Preserve and normalize R0-R4 progress | Tasks 3-4 |
| Unified deterministic mastery and risks | Task 5 |
| Explainable thirty-minute Today Queue | Task 6 |
| Learning Passport adaptive state | Task 7 |
| Accessible Hub surface | Tasks 8-9 |
| Hydration, corruption, quota, and fallback behavior | Tasks 3, 7, 9 |
| Full tests, documentation, browser QA, exact-commit deployment | Task 10 |
| Deferred Error Clinic, R5, capstone, IndexedDB, multi-user | Preserved as non-goals and follow-on projects |
