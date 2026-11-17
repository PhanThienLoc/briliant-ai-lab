# BrilliantAI Design System

## Study workspace

The interface keeps the next learning action, source material and evidence of understanding visible. Home opens with the actual first TodayQueue action and its reason. Evidence summaries and analytics expand on demand.

## Navigation

Desktop uses a 220px sidebar; mobile has four primary destinations: **Hôm nay**, **Thư viện**, **Tạo khóa học**, **Ôn tập**. Tracks R0–R4, the knowledge map, Passport / Checklist, Socratic Lab, Help and History remain in keyboard accessible secondary controls. The profile describes device-local progress without assigning a level or identity. A skip link targets the main content and navigation exposes the current page.

## Visual roles

| Role | Token | Value |
|---|---|---|
| Paper | `--surface` | `#F7F8F2` |
| Panel | `--surface-lowest` | `#FFFFFF` |
| Ink | `--on-surface` | `#17241D` |
| Muted ink | `--on-surface-variant` | `#526258` |
| Primary action | `--primary` | `#157347` |
| Action label | `--on-dark` | `#FFFFFF` |
| Selected field | `--secondary-container` | `#EAF5E9` |
| Evidence | `--tertiary-container` | `#245B98` |

Inter / Manrope / Arial / sans-serif, with monospace reserved for code and numeric traces. Body prose is 16px, labels and metadata 14px, page headings 32–40px. Panels have thin borders and 12–16px corners without hard offset shadows. Focus is visible and controls are at least 44px. Normal foreground/background pairs reach 4.5:1 contrast.

`app/stitch-theme.css` is imported after `app/globals.css` and owns the shared theme. Legacy layouts stay in globals. Explicit descendant foregrounds cover code assistance, token input and dense output panels. Mental-model, delayed-review, activity-brief and hint prose override old small text sizes directly.

## Real learning data

- Loading progress is distinct from an empty queue. An empty TodaySession can open the diagnostic.
- Home offers existing course access and source course creation. Library shows saved courses with search, filters and real progress; Create Course owns source input and draft editing. Both experiences share one SourceStudio state owner.
- Review lists actual R0 and expansion schedules and saved-source review access. Targets retain lesson/course identity, review mode and return origin.
- Review gates still require 72 hours; the interface cannot grant mastery early.
- Questions, graders, prerequisite bridges, repair evidence and storage schemas remain unchanged.
- Source URLs retain provenance only; video needs a transcript and scanned PDFs need text/OCR. The current source engine samples at most six passages. Drafts need an explicit save with at least two lessons.
