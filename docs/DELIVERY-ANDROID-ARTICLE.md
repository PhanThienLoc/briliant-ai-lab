# Android test delivery and article import

## Delivered Android binary

- Package: vn.brilliantai.mobile; Android 6+.
- Development-signed APK SHA-256: c5d30b8e70203df745532ce30b55dd611f6fb288772d25cd9b0955a1b189ea1b.
- Browser-backed launcher using Custom Tabs to the existing hosted Site; internet and a compatible browser are required. Not an offline bundled application.
- APK manifest, archive and development signatures checked. No emulator or physical Android installation/runtime test performed.
- Android build sources were not retained in this checkout; do not describe this repository as containing a reproducible APK build.
- Private signing key is excluded from this repository.

## Article import

- Explicit button fetches public HTTPS HTML/text from a fixed supported-host list through the application server. No AI request occurs during extraction.
- Same-origin POST, bounded request/response, timeout, redirect validation, no credentials, no script/asset rendering, safe errors.
- Unsupported sites, paywalls, PDF links and pages requiring JavaScript have a paste/upload fallback. PDF URLs are not automatically downloaded.
- Five importer regression cases include native Worker HTMLRewriter extraction. Whole-project test run: 313 passed.
- Browser QA: Source Studio input and safe failure observed. A Wikipedia import could not connect in the preview environment, so successful live external import is unverified.
- Real AI generation remains unverified without a user-provided key; do not claim provider end-to-end success.

## User flow

Install APK, open hosted app, configure a free-provider key in AI Settings. In Source Studio, upload a text PDF, paste text, or try a supported article URL. Inspect coverage, select 1–3 sections (up to 12,000 characters), inspect exact outbound source and approve each AI request. Review generated lessons before saving. This is a limited course-generation pilot, not full-book automatic conversion.
