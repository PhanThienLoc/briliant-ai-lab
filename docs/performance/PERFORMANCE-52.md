# CPU baseline and Rust feasibility — 19 November 2026

Tool: rust-anything 1.5.1, installed in a separate scratch prefix from npm, lifecycle scripts disabled. Package integrity recorded during installation: sha512-cGa1TALj03mwPIekPCLwWXffE3rRTzdR6uOE6CGeZJo+A7Ccn0/L9+PaPlByDy/TCa3m/YLiqSfb/oIi2NQlvg==. Version, analyze and profile commands ran successfully. No global setup, MCP registration, app dependency or native binary added to production. Rust compiler/Cargo were not available; no bridge or Wasm build attempted.

Reproduce: `node scripts/bench-source.mjs`. With the pinned CLI available: `rust-anything analyze . --json` and `rust-anything profile . --json -- node scripts/bench-source.mjs`. Profile stdout contains the workload JSON followed by the tool report; the committed profile is the parsed second JSON object. The analysis/profile ran before this two-line memoization change. Reports include benchmark setup/import overhead and tool suggestions are not approved migration targets.

This run was recreated after workspace maintenance removed the unpublished checkout and earlier logs. Do not treat earlier reported timings as results of this retained run. Inputs are deterministic synthetic Vietnamese/emoji text, continuous 118k code units and a separate 60-heading document. Thirty individual warm samples follow ten warmups per workload on Node v24.22.3. A shared host was used; no controlled-device or cross-device result is claimed. Full output is in source-node-baseline.json.

| Operation | p50 ms | p95 ms |
|---|---:|---:|
| Normalize 118k | 1.46 | 4.97 |
| Ingest 118k | 0.48 | 0.64 |
| Continuous coverage 118k | 1.55 | 3.12 |
| Coverage 60 headings | 0.46 | 0.73 |
| SELECT grading | 0.17 | 0.29 |
| JOIN/aggregate grading | 0.49 | 1.19 |

These are Node CPU-only measurements, not browser paint, INP, PDF decoding, network latency, cold Wasm cost or Android performance. The profile highlights documentFromText/normalizeSourceText, but the absolute cost does not justify porting lib/ wholesale. A high share of this synthetic workload is not evidence of a user-visible bottleneck. All-core batching advice must not be assumed applicable to single-threaded Cloudflare Workers.

Decision: retain TypeScript. Memoize the normalized source-character count by text identity so unrelated Studio renders can reuse it. The normalization function, result, source length limits, grading and storage schema remain unchanged. No end-to-end speedup percentage is claimed. No SQL cache, Rust bridge, Wasm runtime or new server is introduced.

Remaining approved work: real browser/Android task baseline including paint/input, cold load and bundle analysis, PDF decoding, network timing, rapid navigation, reduced-motion visual QA. The previous browser URL-policy denial was not bypassed; this pass does not attempt browser interaction. A Rust prototype remains conditional on a meaningful CPU bottleneck and the approved correctness/Android gates.

Release verification on this retained checkout: `npm test` passed production typecheck, content audit, build and 314/314 tests. `npm run lint`: zero errors, three existing unused-disable warnings in generated worker-runtime.d.ts. `git diff --check` passed. No browser/Android or real-provider API tests in this pass.
