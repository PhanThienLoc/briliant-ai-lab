# Final whole-branch review — P2 B04–B10

Reviewed package: `review-8f3a5c7..90d9789.diff`, net changes from production base `8f3a5c7` through `90d9789`. Read the plan Global Constraints, progress ledger, P2 fixes report, and `docs/superpowers/reports/2026-11-16-p2-draft-retention.md`.

## Result: changes requested

One Important finding. No other concrete important regression found in the reviewed changes. No application files edited.

### Important — ordinary programming prose is mistaken for code

**Location:** `lib/source-course.ts:54` (`bookSentences`).

The new rejection expression contains the unanchored alternative `\b(?:def|return|import)\s`. Consequently, ordinary explanatory sentences containing the English verbs `return` or `import` are discarded, even with no code syntax. This applies to every book eligibility/extraction path through `evidenceSpans`, including otherwise clean PDF pages. A normal programming book excerpt can therefore be rejected wholesale by the new screening, contrary to preserving useful chapter prose.

**Exact reproduction:** supply the following 555-character input with `kind: 'book'`, title `Programming concepts`, sourceName `Programming.pdf`:

```text
Trang 1
Pure functions return the same output whenever they receive the same input, so callers can reason about results without tracking hidden state. A program can import a module once and reuse its public functions across separate components to avoid repeating implementation details.

Trang 2
Database queries return only the rows that satisfy their filters, allowing applications to reduce the data transferred between services. Test suites import the module under evaluation and compare actual outputs with expected results for representative inputs.
```

A targeted direct call to `buildSourceCourse` produced:

- `kind: 'article'`: two lessons, each with its two exact original sentences as supported initial/review answers.
- `kind: 'book'`: throws `Không đủ đoạn văn xuôi trong nội dung chương. Hãy bỏ trang bản quyền, mục lục và mã/bảng, rồi chọn ít nhất hai đoạn có nội dung.`

The input contains no copyright, contents, code, table, equations, or numeric noise. This is a lexical false positive on ordinary prose, not a request for semantic understanding or arbitrary PDF reconstruction.

**Requested correction:** make code keyword detection contextual to code structure instead of rejecting these words anywhere in a sentence. Add a focused regression for clean book prose with these verbs, preserving source text and page locators, and retain the current code/table/copyright/contents rejection fixtures. Do not remove noise screening broadly.

## Review coverage and preserved boundaries

- Traced source section eligibility and evidence extraction consistency across headings, paragraphs, pages and subtitle groups; reviewed literal span support and imported option uniqueness/ambiguity checks.
- Checked the previously fixed ordinary transcript and copyright footer paths and the added regression cases.
- Traced catalog-aware completion filtering through repository snapshots, dashboard projections and workspace restore/recording. Historical evidence metadata remains retained while foreign/uncompleted records cannot increase completed dashboard evidence.
- Reviewed the mounted SourceStudio lifetime, hidden/inert containers, visibility-gated reader focus, successful Passport restore revision refresh, and explicit draft save. No additional important static defect found. UI behavior still requires controller browser verification.
- Inspected the expansion changes: all 25 range inputs have explicit labels; stripping aria-label attributes from both old/new changed lines leaves identical non-aria text, so native input bounds/handlers and P1 SQL logic are unchanged.
- Backup schema/keys and byte-preserving read behavior are unchanged. No AI, OCR, remote fetching, or scope expansion added.

## Verification ownership and limits

This was a read-only static review plus the single targeted source-ingestion probe above. No suite, build, lint, git command, browser run, or subagent was launched by this reviewer.

Controller evidence supplied for implementation commit `220672a`: production build and authoring QA passed; full tests passed 242/242. Controller is refreshing lint after removing an untracked unused probe, without application changes. These are controller results, not independently rerun here.

The independent TypeScript invocation has 15 diagnostics matching the exact v39 baseline in codes/messages/files (only positions differ). This is existing typecheck debt, not a newly introduced P2 regression and not a clean TypeScript gate.

Browser green remains pending controller; this report does not claim runtime UI verification or publication readiness. Re-review the correction to the Important finding before final acceptance.


# Scoped final correction acceptance

# Scoped final re-review — 17c3677

## Verdict: ADDRESSED

Reviewed `review-90d9789..17c3677.diff` and `final-fix-report.md`, scoped to the Important ordinary return/import prose finding and new breakage in this correction.

The unanchored keyword-only rejection in `bookSentences` is removed. It is replaced by checks for a function signature or complete structured import/return statement. Consequently, the ordinary English verbs in the exact 555-character reproduction are no longer treated as code. The new regression asserts two lessons, exact original initial/review answers, unchanged page excerpts, page locators, and successful finalization. A separate fixture covers line-leading Return/Import prose through `bookProse` as well.

The correction retains the existing punctuation/code, numeric, repeated-call, table, contents, copyright, marketing and footer guards. The additional structured-code fixture checks simple and comma-separated imports, identifier/call/arithmetic/indexed/quoted returns, and a function signature while preserving neighboring useful prose. No concrete important new regression found in this scoped diff.

No additional requested change. Lexical screening remains bounded; this is not a claim to recognize every programming language or PDF layout.

## Evidence and limits

- Implementer reports the exact reproduction and line-leading prose tests failing before the production change (19 pass, 2 fail).
- Implementer reports an additional failing structured-code case during refinement, followed by 40/40 focused source tests passing after the complete correction.
- This reviewer inspected the diff and evidence; no tests, build, lint, git commands, browser actions or broad review were rerun.
- Fresh full build/tests/lint and browser verification remain controller-owned. This verdict does not claim those pending gates passed.
- Previously confirmed 15 baseline TypeScript diagnostics remain existing debt, outside this correction.

No application files edited by this reviewer.
