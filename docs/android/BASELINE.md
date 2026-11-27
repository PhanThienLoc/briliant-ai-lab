# Android AI Tutor — M0 Task 1 Baseline

**Captured:** 28 November 2026 (Asia/Saigon)
**Plan:** [`2026-11-26-ai-tutor-implementation-plan.md`](./2026-11-26-ai-tutor-implementation-plan.md)
**Scope:** repository and Android feasibility baseline only. No Android feature, SDK, dependency, or product behavior was changed.

This is the historical Task 1 snapshot. Later toolchain installation and the M0 delivery checks are summarized in [FEASIBILITY.md](./FEASIBILITY.md); Android runtime acceptance remains open.

## Repository and environment

| Item | Baseline |
|---|---|
| Branch | `codex/brilliantai-multi-agent-review` |
| HEAD | `e44255631158a1e0e66a21c5eca2cb44a0f307d9` |
| Initial working tree | Existing changes preserved: staged additions `AGENTS.md`, `opencode.json`, `openspec/config.yaml`, `scripts/cloud-install-agents.sh`; unstaged modification `eslint.config.mjs`; untracked `.agents/`, `openspec/changes/`, and `openspec/specs/`. |
| Node.js / npm | Node `v24.22.3`; npm `11.19.1`. The package requires Node `>=22.13.0`, so the current Node version meets the declared engine. |
| Rust / Cargo | Not installed (`rustc` and `cargo`: command not found). `rustup` is also unavailable, so installed Rust targets could not be enumerated. |
| Java runtime | OpenJDK `21.0.13` (Debian build); a full JDK was not established by this baseline. |
| Android SDK / NDK | Not found. `ANDROID_HOME`, `ANDROID_SDK_ROOT`, and `ANDROID_NDK_HOME` are unset; `sdkmanager` is not on PATH; common SDK locations checked were absent. |
| Android targets | No `adb`, `emulator`, or connected Android device/AVD is available. No Android Rust target can be confirmed without Rust/rustup. |

This is the current Linux workspace, not the Windows/WSL checkout described in the referenced interrupted chat. That chat reported an `ENOSPC` install failure in its own checkout. No dependency install was attempted here; the current workspace has ample free disk and its existing dependencies were sufficient for the requested baseline commands.

## Architecture audit

| Area | Current implementation | Android implication |
|---|---|---|
| React / Vinext | React `19.2.6`, Vinext `0.0.50`, Vite `8.0.13`, Next compatibility packages, React Server Components and Cloudflare Vite plugin. `vite.config.ts` runs `vinext()`, the Sites plugin, and Cloudflare environments named `rsc`/`ssr`. `app/page.tsx` renders the client component `app/learning-dashboard.tsx`. | The dashboard is React and has reusable client-side modules, but the current Vite build is an RSC/SSR Cloudflare application, not a standalone static WebView bundle. Keep the existing web build intact and prove a client-only mobile entry separately. |
| Server-dependent routes | `components/learning/ai-course-studio.tsx` calls `generateTeachingText()`, which posts to `/api/ai-course`. `app/api/ai-course/route.ts` validates same-origin JSON and delegates to `requestTeachingText()`. `app/source-studio.tsx` posts URLs to `/api/source-url`; `app/api/source-url/route.ts` calls the bounded article importer. `app/chatgpt-auth.ts` also imports Next server `headers()`/`redirect()`. | The two API routes require the app server and do not exist in a packaged static APK; the auth helper is also server-only. The mobile shell must use a native or other explicitly approved transport; the Tauri feasibility spike should use a mock for the initial UI/build gate. Do not treat the current relative `/api/*` requests as available offline. |
| AI provider abstraction | `lib/ai-provider.ts` validates OpenRouter/Gemini free-tier settings, bounds requests and responses, uses fixed provider URLs, disallows redirects, maps quota/payment errors, and does not silently retry or switch to paid models. `components/learning/ai-context.tsx` holds the key only in mounted React memory; the existing web request sends it to the app's `/api/ai-course` route, which forwards it to the selected provider. | Reuse the validation and free-only policy where possible. A standalone APK needs an explicit native transport boundary and must preserve transient key handling, per-request consent, cancellation, and redaction. No native transport is implemented in Task 1. |
| Article import | `lib/article-import.ts` applies an HTTPS host allowlist, rejects credentials/ports, validates each redirect, bounds response size/time, and extracts article text with `HTMLRewriter`. The route is the server-side caller. | The current importer cannot simply be called from the WebView for URL import; browser-side fetching also changes the security boundary and faces CORS. A later native implementation needs an equivalent constrained URL policy. |
| PDF.js | `lib/source-ingest.ts` dynamically imports `pdfjs-dist` `5.4.449` and points PDF.js at the checked-in `public/pdf.worker.min.mjs`. File ingestion is bounded and page-located, and document cleanup runs in `finally`. | The parser and worker are potential reuse candidates. Verify worker asset resolution and PDF behavior under the Tauri Android asset origin/WebView before claiming support. |
| Python / Pyodide | `lib/python-runner.ts` runs a named module Web Worker with boot and execution timeouts. `public/python-worker.mjs` loads Pyodide `v314.0.6` from `https://cdn.jsdelivr.net/pyodide/v314.0.6/full/`; Pyodide is not bundled locally. | Python currently requires network access to load the runtime and packages. Offline Python is blocked until the required runtime assets are packaged and validated. The Android WebView worker/sandbox boundary must be tested; do not expose Tauri commands or native filesystem access to learner code. |
| Fonts | Manrope WOFF2 font files are bundled under `public/fonts/manrope/` and referenced through local `@font-face` URLs in `app/stitch-fidelity.css`. | Reuse the bundled assets and verify Vietnamese glyph coverage and loading inside the Android WebView; no Google Fonts runtime dependency was found in the app CSS. |
| Local state / Learning Passport | Learning state, courses, drafts, adaptive state, and logs use browser `localStorage` through dashboard/repository modules. AI credentials are not persisted there. `lib/learning-backup.ts` exports only allowlisted learning keys, caps files at 512,000 bytes, validates imports, and rolls back failed writes. | Tauri's WebView storage is app-local and separate from the normal website's localStorage. Preserve portability through explicit Passport export/import; do not promise automatic web-to-APK progress access. Chat/key storage is not part of the existing Passport allowlist. |
| Labs / mastery | Existing curriculum and interactive labs are in the dashboard and `lib/*` graders (including Python, SQL, queue/BFS, ML, and explanation graders). Mastery/evidence modules include `lib/mastery-engine.ts`, `lib/concept-evidence.ts`, and `lib/adaptive-mastery.ts`; they gate mastery on required practice/variant/transfer evidence and delayed review (at least 72 hours), with prerequisite and hint handling. | Reuse deterministic graders and evidence rules as the authority. AI must not award mastery. The Android spike should open dashboard/lesson/SQL flows using mock transport and verify that app/native permissions do not widen learner-code capability. |

### Existing verification

- `npm test` — **PASS**, exit `0`: build/typecheck/content QA passed; 318 tests passed, 0 failed.
- `npm run lint` — **PASS**, exit `0`: 0 errors and 3 warnings. All warnings are unused eslint-disable directives in generated `types/worker-runtime.d.ts` at `1:1`, `10014:44`, and `10031:70`.
- The full Vinext build reached “Build complete” during `npm test`. Its route report lists `/`, `/api/ai-course`, and `/api/source-url`; it marks the API classification as unknown due to static analysis of dynamic API usage.

## Feasibility findings

### Reuse candidates

- React 19 dashboard and client components, existing CSS and locally bundled fonts.
- Pure source parsing, course schemas, content catalogs, validation, deterministic graders, prerequisite/evidence logic, and Learning Passport serialization.
- PDF.js ingestion and its checked-in worker, subject to Android asset/WebView testing.
- AI free-only validation and error policy, subject to a new explicit transport adapter and native key/consent review.

### Android packaging blockers

1. No Rust/Cargo, Android SDK/NDK, `adb`, emulator, or Android target is installed in this environment. Android packaging and device validation cannot be performed here without later provisioning.
2. The current app is built as a Vinext RSC/SSR Cloudflare application and has two app-server routes. A static Tauri package cannot provide those routes by itself.
3. Pyodide is fetched from jsDelivr at runtime, so Python labs are not currently self-contained or offline-capable.
4. Android WebView worker behavior, PDF.js asset paths, WebView-origin storage, and Tauri capability isolation have not been device-tested.
5. The plan references `docs/superpowers/specs/2026-11-26-android-ai-tutor-design.md`, but that specific spec file is absent in this checkout. The implementation plan contains the essential constraints; decisions beyond it remain provisional until the spec is restored or confirmed unnecessary.
6. The existing `docs/performance/PERFORMANCE-52.md` is a Node CPU baseline, not Android evidence. It supports retaining TypeScript for now and using Rust for Tauri/native integration or only for a later measured bottleneck; it does not prove Android performance.

### Minimum viable Tauri 2 architecture

- A Tauri 2 Rust host packages static frontend assets and exposes only narrow, allowlisted commands. The WebView gets no arbitrary native command, filesystem, or endpoint access.
- A client-only React/Vite frontend reuses the dashboard and pure learning modules while keeping the current web/Vinext build unchanged. Start the feasibility UI with a mock transport; introduce secure provider/source transports only in their planned tasks.
- Keep browser storage local to the installed app and use explicit Learning Passport import/export for moving progress between web and Android.
- Bundle and resolve required frontend assets deliberately. Test PDF.js worker and fonts; decide how to package Pyodide before advertising offline Python.

**Separate Vite entry:** plan for one. The existing Vite config couples Vinext RSC/SSR and Cloudflare server environments to the web app. A small `mobile/index.html` plus React mount (and an isolated mobile Vite config if required) is the cleanest way to build static Tauri assets without changing web behavior. This is a source-based feasibility recommendation, not yet an experimentally proven Vinext limitation; Task 2 should first attempt the plan's minimal static build and add the separate entry only if that output still requires RSC/server runtime.

## Exact scope for M0 Task 2 — Tauri/React Android feasibility spike

Per the implementation plan, Task 2 is limited to `docs/android/FEASIBILITY.md`, a minimal `src-tauri/*` shell, and `package.json` scripts named `mobile:build`, `android:dev`, and `android:build`. Create `mobile/*` only if the static experiment requires a separate client entry. Keep the existing web build command unchanged.

The spike should:

1. Test whether the current frontend can emit standalone static assets with no RSC/server route at runtime.
2. If not, create a minimal separate Vite/React entry that imports reusable client UI; do not port the app or replace its framework.
3. Configure minimal Tauri capabilities and CSP, then use mock transport to exercise dashboard, lesson, and SQL screens.
4. Check Vietnamese fonts, PDF.js worker loading, Python runtime loading, and that learner Python cannot access Tauri commands, filesystem, or app storage.
5. Run `npm run mobile:build`, `cargo test --manifest-path src-tauri/Cargo.toml`, and `npm run android:build` (backed by `tauri android build --apk`); record SDK/NDK/target/device blockers instead of claiming an APK when unavailable.
6. Install on a real device only when one is available; otherwise leave device/WebView/ABI verification explicitly open.

No Task 2 implementation was started during this baseline task.
