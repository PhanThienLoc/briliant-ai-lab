# M0 Task 2 — Tauri/React feasibility spike

Initial spike captured 28 November 2026, Asia/Saigon; updated for the approved M0 baseline/feasibility delivery checkpoint. No APK or Android runtime success is claimed. Historical spike observations are distinguished from the current checkpoint checks below.

**Gate: HOLD at M0.** The existing frontend is feasible as static assets on desktop Chromium. A separate Vite/React entry is unnecessary for this spike. The minimal Tauri shell is configured and schema-validated, but native compilation and Android security/runtime checks remain unverified. The shell's restricted CSP blocks the existing CDN-loaded Pyodide runtime; this must be resolved before the promised offline Python experience is feasible.

## Repository preservation

- Branch: `codex/brilliantai-multi-agent-review`.
- HEAD: `e44255631158a1e0e66a21c5eca2cb44a0f307d9` throughout the task.
- Pre-existing staged additions: `AGENTS.md`, `opencode.json`, `openspec/config.yaml`, `scripts/cloud-install-agents.sh`.
- Pre-existing unstaged change: `eslint.config.mjs`.
- Pre-existing untracked files: `.agents/**`, `docs/android/BASELINE.md`, and the OpenSpec placeholder files.
- The Git index and hashes of pre-existing files were captured before work. Only `package.json` was intentionally changed by this task, adding three scripts. The four staged files, existing ESLint change, baseline document, skill assets, and root `package-lock.json` were preserved.
- No branch switch, reset, clean, staging, commit, push, merge, deployment, or environment publication occurred.

This report supersedes Task 1's tentative recommendation to plan for a separate Vite entry. The experiment below proved that this version of Vinext can export this application's current local screens. The original baseline was preserved as historical evidence.

## Phase A — static frontend

### Experiment and result

Copied the current source/configuration into a scratch directory, linked its existing `node_modules`, and set `output: "export"` only in the scratch Next config. No application dependency was installed or changed for Phase A.

Command: `bash scripts/sites-env.sh -- timeout 120s node node_modules/vinext/dist/cli.js build` in the scratch copy.

**PASS, exit 0.** Vinext `0.0.50` / Vite `8.0.13` reported:

```text
Pre-rendering all routes (output: 'export')...
Prerendered 2 routes (2 skipped).
Route (app)
○ /
λ /api/ai-course
λ /api/source-url
Build complete.
```

The client output contains `index.html`, static `index.rsc`/`404.html`, bundled JS/CSS, PDF.js, PDF/Python workers, and local Manrope fonts. RSC is used at build time and a static RSC payload ships with the page; the tested local flows do not require a running RSC server. The two POST API routes were skipped rather than exported as working APIs.

Served only `dist/client` using Python's static HTTP server on port 4173. No Vinext, Cloudflare, or app API server was running for the UI checks. Opened the static output in shared Chromium and verified actual interaction, not just rendered HTML.

| Check | Result and evidence |
|---|---|
| Dashboard | **PASS (desktop browser).** Vietnamese headings, queue, library/navigation controls, and local progress UI hydrated and responded. |
| Existing lesson | **PASS (desktop browser).** Opened Library → R0 → “Vector và dot product”; prediction choices, the live feature-contribution visual, and weight slider rendered. Observed in the original browser session; screenshot evidence is local to that session and is not a portable release artifact. |
| SQL lab | **PASS (desktop browser).** Opened Tracks → R2 → SQL SELECT pipeline. Ran `SELECT id, amount FROM orders WHERE region = 'south' AND amount >= 180 ORDER BY amount DESC;`. Returned `(6, 430)`, `(2, 220)`, `(4, 180)` and `3/3 datasets`, with “Evidence đạt”. This affected only the test browser origin's local progress. No mastery/delayed-review bypass was performed. |
| Separate Vite entry | **NOT NEEDED for this spike.** Static export and existing-component interaction succeeded. No `mobile/*` entry or duplicate UI was created. |
| Server functionality | **UNAVAILABLE in the static shell.** `/api/ai-course` and `/api/source-url` still need the transport work scheduled in later tasks. No live AI calls or credential use occurred; these local flows did not invoke a transport. No mock AI response is being claimed. |

### PDF.js and Pyodide

Used a scratch-only compatibility page on the same static origin. The PDF probe imported the generated PDF.js chunk and the bundled worker. The Python probe used the existing `runPythonLab` implementation with TypeScript types stripped for the browser probe, plus the unmodified exported Python worker. Inputs were synthetic and contained no credentials or user documents.

| Runtime | Desktop static HTTP result | Remaining boundary |
|---|---|---|
| PDF.js `5.4.449` | **PASS.** The real worker extracted `First page`, an empty second page, and `Third page` from the existing three-page fixture. Also passed with the restrictive CSP described below. | Tauri asset-origin handling, Android WebView APIs, real file picking, large/encrypted/scanned PDFs, and memory behavior are not device-tested here. |
| Pyodide `v314.0.6` | **PASS with network and without the shell CSP.** `add(2, 3)` passed its grader. A separate `import js` attempt was rejected with `SafetyError: Cấu trúc Import không được phép trong sandbox`. | Runtime currently loads from `https://cdn.jsdelivr.net/pyodide/v314.0.6/full/`; it is not bundled or offline. This one rejected import does not establish complete sandbox isolation. |
| Pyodide with shell CSP | **FAIL for Python availability; expected network restriction.** The worker returned `Python worker gặp lỗi và đã được đóng an toàn.` and no grading pass. The local-only script policy excludes the worker's CDN module import. The same worker passed on the unrestricted test origin. | Bundle the required runtime assets and validate the sandbox in Android before enabling Python in the native package. Broadening remote script access was not used as a workaround. |

The PDF probe initially needed a browser-compatible replacement for Node's `Buffer.byteLength` in the test fixture generator (`TextEncoder`); application code was not changed. Importing the generated PDF chunk from the auxiliary probe page also initializes Vinext's client bootstrap, which logged a missing RSC payload for that auxiliary page. This does not affect the exported `/` route; the application root hydrated and navigated under both test policies.

## Reproducible frontend and native skeleton

- `npm run mobile:build` runs `scripts/build-mobile.mjs`. It copies an explicit list of source/config files into temporary scratch, merges `output: "export"` into a scratch copy of the web config, and exports only the client assets to ignored `dist/mobile`. It does not copy `.env` files, change web config, or replace `dist/client`/`dist/server`.
- `npm run android:dev` invokes `tauri android dev`; `npm run android:build` invokes `tauri android build --apk` through `src-tauri/tools/run.mjs`.
- Tauri CLI `2.12.6` is isolated under `src-tauri/tools`, with its own package manifest and integrity lockfile. Installed with `--ignore-scripts --no-audit --no-fund`; two packages, approximately 20 MiB installed. Reproduce with `npm ci --prefix src-tauri/tools --ignore-scripts`.
- `src-tauri/Cargo.toml` pins `tauri =2.12.7` and `tauri-build =2.7.6`, confirmed in the official crates sparse index. Both declare Rust 1.90 minimum. The original spike had no Cargo lockfile. This delivery adds `src-tauri/Cargo.lock`, resolved with Rust 1.90 compatibility fallback, and a root `rust-toolchain.toml` pinning Rust 1.90.0, minimal profile, rustfmt, and the Android ARM64 target. Locked metadata validation does not compile or test native code.
- Rust source contains only the minimal desktop/mobile entry and Tauri builder: no plugins, application commands, provider transport, file access, shell execution, or `invoke_handler` registration.
- `src-tauri/tauri.conf.json` points `frontendDist` at `../dist/mobile`. The identifier is explicitly for the feasibility shell (`com.brilliantai.feasibility`), not a decided release application ID. Android generated project initialization has not run.

## Phase B — historical installation assessment

This table records the original spike environment. Phase 1 subsequently installed the base JDK/Rust/command-line tools; see the current checkpoint section below.

| Item | Observed state |
|---|---|
| Host | Debian 13 x86_64; Node `24.22.3`, npm `11.19.1`. |
| Java | Java runtime `21.0.13` exists, but `javac` is absent and `JAVA_HOME` unset. A complete Android-capable JDK is not confirmed. |
| Rust | `rustc`, `cargo`, and `rustup` absent. |
| Android | SDK/NDK variables unset, `sdkmanager`, `adb`, and emulator absent. No Android targets or device verified. |
| Desktop native build | `webkit2gtk-4.1` and `rsvg2` development prerequisites absent according to Tauri CLI info. Their absence blocks a Linux desktop fallback, independently of the Android SDK. |
| Disk / download access | About 59.6 GiB free. Official Rust installer and Android SDK repository HEAD requests returned HTTP 200. Installation appears possible in writable workspace prefixes; no completed installation is claimed. |
| Download assessment | Android repository metadata lists command-line tools at about 173 MiB, Android 35 platform at 61 MiB, build tools at 59 MiB, and NDK releases around 633–747 MiB compressed, before extraction, Rust, Gradle, caches, and system images. These are sizing observations, not selected/validated target versions. |
| Emulator | `/dev/kvm` is absent. An accelerated emulator cannot be assumed; software emulation or a real connected device needs separate assessment. This does not by itself prevent APK compilation. |

Large Rust/Android toolchains were not installed. Phase A established browser frontend feasibility, while this Phase B pass assessed the provisioning requirements and tested the minimal shell configuration. Native compilation is a **remaining gate**, not a proven incompatibility of Tauri with the application.

## Capabilities and security checks

**PASS at schema/source/browser-policy level; native enforcement UNVERIFIED.**

- Validated `tauri.conf.json` and the capability file against the official Draft 7 schema shipped with CLI `2.12.6`.
- Only the explicit `feasibility` capability is enabled, scoped to `main`, with `local: true`, an empty `permissions` array, and no remote URLs. `withGlobalTauri` is false. No native filesystem, shell, HTTP, or application command is exposed by the shell source.
- CSP restricts default/script/font/worker sources to bundled/local assets (plus `blob:` for workers). It permits Wasm compilation without general JavaScript `unsafe-eval`; styles retain inline support required by the existing React UI. It denies frames, objects, and form submissions; IPC endpoints are reserved for Tauri.
- Replayed this CSP through a local static server on port 4174, adding hashes of bundled inline scripts to simulate Tauri's documented build-time hashing. The root dashboard hydrated and navigated to the library; PDF extraction passed; CDN-loaded Python failed closed. This is Chromium HTTP evidence, not an APK/WebView test.
- No model/source output was executed, no real provider request was made, and no credentials were read or written. Android verification that Python cannot access Tauri IPC, app storage, or native files is still open.

## Historical spike command results and exact errors

| Command/check | Result |
|---|---|
| Scratch Vinext static export | **PASS**, exit 0. |
| `npm run mobile:build` | **PASS**, exit 0; `dist/mobile/index.html` produced. |
| Tauri config/capability JSON schema validation | **PASS**, CLI 2.12.6 schema. |
| `npm run lint` | **PASS**, exit 0; 0 errors, the same 3 unused-disable warnings at `types/worker-runtime.d.ts` lines 1, 10014, 10031. |
| `npm test` | **PASS**, exit 0; web typecheck/content QA/build passed; 318 tests passed, 0 failed. |
| `npm run android:build` | **FAIL (environment)**, exit 1, before APK compilation. See exact error below. |
| `cargo test --manifest-path src-tauri/Cargo.toml` | **FAIL (environment)**, exit 127: `cargo: command not found`. No Rust test result exists. |
| Emulator / real Android / native capability enforcement | **UNVERIFIED**. No APK built or installed. |

```text
failed to run 'cargo metadata' command to get workspace directory:
failed to run command cargo metadata --no-deps --format-version 1:
No such file or directory (os error 2)
```

These results summarize the retained local spike logs. The logs and auxiliary browser probes are not committed release artifacts. Use the reproducible commands below to validate a checkout; prior browser observations are not substitutes for Android device testing.

## Gate decision and remaining work

**Proceed with the static-export architecture, retain the existing React/Vinext UI, and hold further feature implementation at this gate.**

To close M0 Task 2: provision the remaining native prerequisites, initialize the Android project, compile/test the native shell, and validate the static RSC payload/assets under the Android WebView origin. Package the required Pyodide assets with the same restrictive CSP and test learner-code isolation, cancellation/timeouts, PDF workers, Vietnamese fonts, and local persistence on an emulator or device. Document Android/WebView/ABI details and keep the real-device gate open until exercised.

The spike does not implement streaming chat, live AI/native source transport, new mastery rules, or release packaging. Existing web behavior and root dependencies remain unchanged.

## Current approved delivery checkpoint

This commit delivers a baseline/feasibility checkpoint, not full M0 completion. The application UI, web build command, and root package-lock.json remain unchanged. New code is confined to mobile export, the native shell, and the security regression tests.

- The static export copy excludes `.env` and `.env.*` files and directories recursively, including below `public`. Regular public JSON, fonts, workers, images and similarly named legitimate assets are preserved. Source symlinks are rejected explicitly rather than allowing an innocent filename to alias a private file.
- Before publishing assets to `dist/mobile`, the output audit rejects environment files, private build manifests/configuration, signing material, and symbolic links. The audit checks names/types rather than promising detection of arbitrary secrets embedded in otherwise public content. Review public source assets before shipping.
- `tests/mobile-build.test.mjs` exercises nested temporary fixtures, public-asset preservation, output rejection, and Android Git tracking rules. The environment-copy test reproduced the original leak and passed after the filter was added.
- `src-tauri/.gitignore` keeps generated Android Gradle/wrapper/manifest source trackable while ignoring build directories, Gradle/Kotlin/native caches, local.properties, and signing files. SDKs and installed dependencies stay outside the commit.
- Phase 1 verified Temurin JDK 21.0.13+9, Rust/Cargo 1.90.0, rustup 1.29.3, the Android ARM64 standard library, and official command-line tools revision 23.0. The SDK contains no Platform, Build Tools or NDK.
- `tauri android init --skip-targets-install` stopped before generation because the NDK was missing; automatic installation was declined. Checksum-verified CLI 2.12.6 source identifies its automatic NDK setup package as `ndk;29.0.13846066`. That setup default is not a generated project's explicit ndkVersion.
- CLI templates specify compileSdk/targetSdk 37, AGP 9.3.1, Gradle 9.6.1 and Kotlin 2.2.10. Neither buildToolsVersion nor ndkVersion is explicitly set. The SDK metadata's 37/37.0 package mapping still needs confirmation during approved native provisioning.
- Native Android compilation, native Cargo tests, emulator/device execution and native permission enforcement remain unverified. The shell CSP still blocks the current remotely loaded Pyodide; offline runtime assets and Android sandbox checks remain open.

### Delivery validation evidence

On the delivery worktree based on main commit `98c6b6710a089e9a10ca1ed39f28a2792105369c`:

| Check | Result |
|---|---|
| Nested-fixture/mobile policy tests | PASS: 5 tests, including the reproduced environment-copy and symlink-alias failures before their fixes |
| Application lint | PASS: 0 errors, 3 pre-existing unused-disable warnings in generated worker types |
| Full npm test | PASS: 323 tests; web typecheck, authoring audit and production build passed |
| Static mobile build | PASS: standalone HTML/RSC/assets exported and private-output audit passed |
| Public assets | PASS: all 12 existing public files preserved byte-for-byte in the export |
| Locked Cargo metadata | PASS on Rust 1.90.0; Android-filtered metadata resolved without compilation |
| Cargo formatting | PASS: `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` |
| Root package-lock.json | Unchanged from the delivery base |

The Cargo lockfile contains the local crate plus 432 registry dependencies with checksums. All packages in the selected metadata graph declare a Rust requirement no newer than 1.90 (or no explicit requirement). This is dependency-resolution evidence, not successful native compilation. The browser observations earlier in this report were not rerun as Android tests for this checkpoint.

### Reproducible validation

Use Linux with Bash/GNU timeout and the pinned Rust toolchain available on PATH. Install the locked Node dependencies in a fresh checkout if needed:

```sh
npm ci
npm ci --prefix src-tauri/tools --ignore-scripts
```

Run the checkpoint checks from the repository root:

```sh
node --test tests/mobile-build.test.mjs
npm run lint
npm test
npm run mobile:build
cargo metadata --locked --format-version 1 --filter-platform aarch64-linux-android --manifest-path src-tauri/Cargo.toml
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
```

`npm test` includes the web typecheck/content audit/production build and Node tests. `mobile:build` builds the static frontend and runs the private-output audit without changing the web configuration. Cargo metadata and formatting perform no Android compilation. Browser checks can be repeated by serving only `dist/mobile` with a static HTTP server and navigating the dashboard, R0 lesson, and SQL lab; this tests HTTP Chromium behavior, not the Tauri/Android asset origin.

For lockfile regeneration, use Rust 1.90.0 with `CARGO_RESOLVER_INCOMPATIBLE_RUST_VERSIONS=fallback cargo generate-lockfile --manifest-path src-tauri/Cargo.toml`, then review and validate the resulting lockfile. Normal verification must retain `--locked`.

## Official references consulted

- [Tauri frontend/static export constraints](https://v2.tauri.app/start/frontend/nextjs/) (guide examples target Next 14.2.3; the actual Vinext 0.0.50 behavior was tested locally).
- [Tauri prerequisites and Android targets](https://v2.tauri.app/start/prerequisites/).
- [Tauri capabilities and remote access](https://v2.tauri.app/security/capabilities/).
- [Tauri CSP and automatic asset hashing](https://v2.tauri.app/security/csp/).
- Installed Vinext README and `dist/build/run-prerender.js` for this version's `output: "export"` behavior; installed Tauri CLI config schema for validation.
