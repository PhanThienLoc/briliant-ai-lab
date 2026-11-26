# BriliantAI Lab

Phòng gym tư duy tương tác dành cho người học AI và Data: **khái niệm → trực giác → toán → code → hệ thống → chuyển giao sau trì hoãn**.

Repository này khởi tạo Release 0 của kế hoạch sản phẩm. Phiên bản hiện tại cung cấp:

- Dashboard học tập với Today Queue, Skill Map và Review Queue.
- Adaptive session trên Learning Hub chọn bài ôn, sửa lỗi, nối prerequisite và thực hành mới từ evidence cục bộ; mỗi hành động nêu lý do và evidence cần đạt. Quy tắc mastery là tất định, AI không được cấp mastery.
- Runtime data-driven cho 14 lesson và 70 hoạt động của khóa *Từ dữ liệu thô đến mô hình biết học*.
- Lesson schema và một lesson nguồn mẫu.
- Mastery state machine có kiểm thử.
- Learner Diagnostic 10 câu trên 5 trục, lưu baseline và đề xuất lesson bắt đầu từ lỗ hổng sớm nhất.
- Python Code Lab chạy code thật với 42 hidden tests, timeout và sandbox dùng một lần.
- Explanation Defense chặn sao chép hint/từ khóa và Code Coach hỗ trợ cú pháp cho đủ 14 lesson.
- Explanation Coach phản hồi theo mắt xích nhân quả, đưa từng lỗi vào Hàng đợi sửa mental model và tự xóa khi người học vượt lại.
- Explanation Calibration có 56 ca biên trên đủ 14 lesson và concept aliases để giảm chấm oan khi người học dùng cách diễn đạt tương đương.
- Authoring QA gate kiểm tra source, answer, rubric, 42 misconception, Code Coach và accessibility trước mọi production build.
- Sáu họ trực quan tương tác phủ đủ 14 lesson: Data Lens, Function Machine, Dot Product, Error Lab, Gradient Descent và Generalization Lab.
- Personal Learning Mirror tính evidence, retry, hint dependency, delayed mastery và lỗi Python ngay trong trình duyệt.
- Toàn bộ tiến độ và learning log nằm trong `localStorage`; không tài khoản, database hay telemetry server.
- Learning Passport xuất và khôi phục checkpoint JSON đã kiểm tra, có rollback để bảo vệ dữ liệu hiện tại.
- Source Studio tạo bản nháp lộ trình từ PDF có lớp chữ, TXT/Markdown, transcript SRT/VTT hoặc văn bản dán vào. Mỗi bài giữ trích đoạn nguồn, kiểm tra hiểu và một câu biến thể mở sau 72 giờ; khóa học và tiến độ nằm trong Learning Passport.
- R1/R2 có 11 lab tương tác trên learning graph; mỗi prerequisite edge có transfer check riêng, còn delayed review R0/R1/R2 được ưu tiên chung trên Learning Hub.
- SQL sandbox parse và thực thi `INNER/LEFT/RIGHT/FULL OUTER JOIN`, `WHERE`, `GROUP BY`, `HAVING`, scalar aggregate subquery, `COUNT/SUM/AVG/MIN/MAX`, `ORDER BY`, `LIMIT` hoàn toàn cục bộ; challenge được chấm theo bảng kết quả thay vì so khớp chuỗi query.
- Queue/BFS grader replay toàn bộ operation/transition trace và kiểm tra từng trạng thái trung gian, nên một traversal cuối đúng do đoán vẫn không đủ evidence.
- PRD, kiến trúc, curriculum map và CI nền tảng.

## Product rule

Mastery không được cấp vì người học mở xong lesson. Một concept chỉ được coi là vững khi người học giải độc lập, giải một biến thể, vượt lần ôn sau ít nhất 72 giờ và chuyển được sang code/data/system.

## Quick start

```bash
npm ci
npm run dev
```

Quality gates:

```bash
npm run lint
npm run audit:content
npm test
```

## Repository map

- `app/`: working learning surface.
- `content/`: versioned course content and JSON schemas.
- `lib/`: curriculum data and deterministic mastery logic.
- `docs/`: product, architecture, curriculum, and decision documents.
- `tests/`: rendered-app, content, and domain tests.
- `.github/workflows/`: continuous integration.

## Current scope

Release 0 is a focused eight-week MVP; R1/R2 currently add an eleven-lab prerequisite and delayed-review path. The project deliberately excludes payments, social features, a public CMS, GPU training infrastructure, arbitrary server-side notebooks, and autonomous lesson publication.

Source Studio is a local, deterministic draft generator. A URL is retained as provenance but is not fetched; video needs a supplied transcript, scanned PDFs need OCR, and generated questions must be checked against the source before use. It stores excerpts instead of the full uploaded file. No external AI service receives the source.

See [Product requirements](docs/PRD.md), [Architecture](docs/ARCHITECTURE.md), [Curriculum](docs/CURRICULUM.md), [Design system](docs/DESIGN-SYSTEM.md), and [Roadmap](docs/ROADMAP.md).

## Android AI Tutor (planned)

The Android AI Tutor is in the planning stage. The current plan reuses the React learning experience inside a Tauri Android shell, with Rust limited to native capabilities and measured bottlenecks. AI inference is restricted to free providers, and every request requires an exact preview and separate user consent. No Android implementation or APK is claimed by this plan yet.

See the [Android AI Tutor implementation plan](docs/android/2026-11-26-ai-tutor-implementation-plan.md) for milestones, security constraints, and acceptance gates.

## Runtime

The web application runs on [vinext](https://github.com/cloudflare/vinext). Product state is deliberately browser-local.

## Prerequisites

- Node.js `>=22.13.0`
- Linux with `flock`, `curl`, and GNU `timeout`

## Sites lifecycle

The Sites lifecycle CLI runs the locked dependency install before returning this checkout. Edit the source under `app/`, then checkpoint when a coherent milestone is ready to inspect or share. The remote Sites builder runs `npm run build` against the pushed commit. Do not repeat install or build as a normal pre-checkpoint step.

This starter does not use `wrangler.jsonc`.

`install:ci` is intentionally a single, non-retrying `npm ci`. It refuses a concurrent install for the same project, consumes a matching image-seeded npm cache with `--prefer-offline` while retaining registry fallback for a missing cache object, otherwise downloads and verifies the complete vinext tarball recorded in `package-lock.json`, limits npm to one socket, and terminates a stalled install. `build` applies a short timeout. These helpers target Linux and use GNU `timeout`; they are not native macOS scripts.

Scripts that need writable project-scoped home, npm, XDG, and temporary paths use `scripts/sites-env.sh`. The `dev` and `start` scripts honor the caller's runtime environment and keep Wrangler logs inside the checkout. The generated `.sites-runtime/` directory is disposable and ignored by Git.

## Included starter shape

- edit site code under `app/`
- `app/chatgpt-auth.ts` provides optional dispatch-owned ChatGPT sign-in helpers
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/index.ts` reads the D1 binding from the Cloudflare Worker environment
- `db/schema.ts` để trống có chủ ý vì sản phẩm không dùng database
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

OpenAI workspace sites can read the current user's email from
`oai-authenticated-user-email`.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Diagnostic Commands

- `npm run install:ci`: perform the one bounded lockfile install
- `npm run dev`: start the Vite/Vinext development server
- `npm run build`: build the deployable Sites artifact
- `npm run start`: start the built Vinext application
- `npm test`: build and verify the rendered dashboard, lesson content, and mastery rules
- `npm run db:generate`: generate Drizzle migrations after schema changes

Use build commands for targeted diagnosis after a remote failure, not as part of the normal checkpoint path.

The timeout defaults can be overridden for a controlled canary with `SITES_INSTALL_TIMEOUT`, `SITES_INSTALL_KILL_AFTER`, `SITES_BUILD_TIMEOUT`, and `SITES_BUILD_KILL_AFTER`. A timeout fails the command; the helpers never retry an unchanged install or build.

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
