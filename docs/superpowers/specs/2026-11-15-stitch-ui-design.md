# BrilliantAI approved Stitch interface

User approved implementation on 2026-11-15 after reviewing https://stitch.google.com/projects/12550793354671228918?pli=1 . Implement the calm Home, Library, Create Course, Workspace and Review design in the existing real application. Two archived Workspace drafts are not references.

## Visual contract

- Paper #F7F8F2, white panels, ink #17241D, muted #526258, emerald #157347 with white labels, selected pale green #EAF5E9 and evidence blue #245B98.
- Inter/Manrope/Arial/sans-serif; body16px, normal labels and metadata14px, page headings32–40px. Code/numeric traces may be monospace.
- Thin borders, radius12–16px, no brutalist black surfaces, no hard offset shadow. Inline SVG icons, no icon fonts, mock avatars or external placeholders.
- Normal text contrast>=4.5:1, visible focus, controls>=44px. Desktop sidebar220px, four primary mobile destinations, no page overflow at390px.

## Experience

Home literal headline: “Hôm nay, học sâu hơn một chút.” Supporting: “Tiếp tục bài học đang mở hoặc xem các nội dung ôn tập.” Lead with actual TodaySession action, reason, reviews and prerequisite/topic. Secondary analytics expandable. No fake mastery, profile, streak or progress.

Primary navigation: Hôm nay, Thư viện, Tạo khóa học, Ôn tập. Keep Tracks, Map, Passport/Checklist, Socratic Lab, Help and History in accessible secondary controls. Profile wording truthfully describes device-local progress. Add skip link and current page semantics.

Library uses actual saved courses, labelled search/source filters, subject covers, provenance, actual lesson counts/progress and honest empty/loading/error states. Curated R0–R4 remain reachable. Create Course is distinct: source input/extraction, title/goal editing, editable draft preview and explicit save of>=2 lessons. Preserve exact course/lesson identities. Current engine samples at most6 passages; URLs store provenance only, video requires transcript and scanned PDF requires text/OCR. No invented AI chat, backend queue or coverage percentage.

Workspace is focused: compact back/progress header, vertical outline, broad question/live instrument area and contextual guidance/evidence. Hide full global navigation beside the outline. Move existing instrument, never duplicate grader/state. Collapse outline/support accessibly on mobile. Review opens the real R0, expansion and source review runtimes from correct origin.

## Binding constraints

Preserve localStorage keys/schema, saved progress, graders SQL/Python, prerequisite/bridge gates, repair/evidence and72h review semantics. Keep Site id, URL and custom audience. No new runtime dependency/backend/model integration. Do not import mock Stitch records or generated HTML wholesale.

## Acceptance

All five experiences work with real data and honest empty/error states. Build/regression and requested lint pass; update obsolete visual assertions only, retain learning assertions. Browser-check source draft/save/open/reload, prediction/check/hint, review route, keyboard and390px. Publish tested source to existing Site.
