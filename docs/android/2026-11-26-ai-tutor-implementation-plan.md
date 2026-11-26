# BrilliantAI Android AI Tutor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cung cấp APK Android cho BrilliantAI: học qua chat bằng API miễn phí, system prompt chuyên dụng, tạo khóa từ PDF/bài viết, dùng lại lab và tiến độ hiện có.

**Architecture:** Giữ React/TypeScript và giao diện Stitch; thêm Tauri 2 với Rust cho chức năng native. Một bộ điều phối tutor quản lý phiên học; adapter web/native dùng cùng contract. Các grader và quy tắc mastery hiện tại vẫn là nơi xác nhận năng lực.

**Tech Stack:** React 19, TypeScript, Vite/Vinext hiện có; Tauri 2/Rust cho Android; OpenRouter/Gemini qua adapter giới hạn; PDF.js hiện có; Node test runner và Cargo tests. Phiên bản bổ sung phải được khóa sau khi kiểm tra tương thích ở M0.

**Spec:** `docs/superpowers/specs/2026-11-26-android-ai-tutor-design.md` trong source dự án. Bản này chứa lại các quyết định và yêu cầu thiết yếu để đọc độc lập.

**Ngày lập:** 26/11/2026, giờ Việt Nam. **Trạng thái:** kế hoạch để duyệt; chưa có APK, chat streaming hay lõi Rust được triển khai theo kế hoạch này.

## 1. Global Constraints

- Chỉ inference miễn phí; không tự chuyển sang model hoặc dịch vụ trả phí.
- Mỗi yêu cầu AI cần bản xem trước chính xác và đồng ý gửi riêng. Retry cũng cần duyệt mới.
- API key mặc định chỉ nằm trong bộ nhớ; không ghi vào URL, log, backup hoặc bản build.
- Với Gemini, app không thể xác minh billing chỉ từ key; phải nêu đúng giới hạn này và yêu cầu người dùng xác nhận Free Tier chưa bật billing.
- Giữ grader, prerequisite, evidence và delayed review sau ít nhất 72 giờ. AI không có quyền tự cấp Mastered.
- Giữ bản web và audience hiện tại; không tự triển khai thay đổi web khi đang thử Android.
- React/Stitch là chuẩn trực quan; không xây lại toàn bộ UI bằng Kotlin hoặc Rust.
- Không thêm tài khoản, telemetry, đồng bộ cloud, model chạy local hay chuỗi multi-agent inference trong bản đầu.
- Đọc khóa đã lưu, làm lab đủ tài nguyên và xem tiến độ không cần mạng; AI mới luôn cần mạng.
- Android không tự đọc được localStorage của website; chuyển tiến độ qua Learning Passport do người dùng chủ động nhập/xuất.
- Rust dùng cho native và điểm nghẽn đã đo; không hứa giảm độ trễ model bằng Rust.
- Bản đầu chỉ hỗ trợ bài viết công khai đọc được; trang đăng nhập, paywall, chỉ render JavaScript hoặc chặn truy cập phải báo giới hạn và cho dán văn bản/PDF thay thế.
- Mọi câu trả lời model và nội dung nguồn đều là dữ liệu không tin cậy; không chạy mã, HTML, tool hoặc lệnh native do chúng cung cấp.

## 2. Review Focus

1. **Đổi nguồn/model trong lúc gửi:** không gửi nội dung khác với bản đã duyệt; không gắn câu trả lời cũ vào phiên mới. Task 3, 4, 7.
2. **Mạng rớt/app vào nền khi streaming:** giữ draft, đánh dấu câu trả lời chưa hoàn tất, không tự gửi lại hoặc cấp evidence. Task 4, 7, 9, 13.
3. **PDF lỗi, URL tới mạng nội bộ, chỉ dẫn độc hại trong nguồn:** giới hạn tài nguyên, từ chối truy cập nguy hiểm, không coi nội dung tài liệu là system instruction. Task 6, 8.
4. **Nhập backup hỏng hoặc hết dung lượng:** giữ nguyên dữ liệu cũ; khôi phục có rollback; không lẫn key/chat vào Passport cũ. Task 9.
5. **Python/WebView/offline không tương thích:** kiểm tra runtime trên điện thoại thật, không đưa quyền shell/native cho code người học và không hiển thị đạt nếu chưa chạy grader. Task 2, 10, 13.

## 3. Hiện trạng và phạm vi tái sử dụng

| Đã kiểm tra trong source | Cách dùng tiếp |
|---|---|
| `lib/ai-provider.ts` | Tận dụng validation, thông báo lỗi, policy miễn phí; hiện chưa có system role riêng hay streaming |
| `components/learning/ai-course-studio.tsx` | Tận dụng xem trước/consent và hủy; hiện tutor hỏi đáp từng câu, chưa có transcript |
| `app/api/ai-course/route.ts` | Giữ đường server cho web; không giả định route này chạy trong APK |
| `app/api/source-url/route.ts`, `lib/article-import.ts` | Giữ web import; tạo đường native có chính sách URL tương đương |
| `lib/ai-course.ts`, các module `source-*` | Giữ schema, parser, dẫn nguồn và tiến trình tạo khóa |
| `lib/learning-backup.ts`, `lib/learning-repository.ts` | Giữ canonical evidence và Passport; không nhân bản mastery trong Rust |
| R0 và expansion workbench | Mở lab từ chat, trả về đúng cuộc hội thoại |
| Checkpoint Stitch v53 | Nền UI được lưu; còn thiếu visual QA, không coi là giao diện đã được xác nhận hoàn chỉnh |
| Benchmark Node đã có | Chỉ là CPU baseline; không phải số đo Android, INP hay tốc độ mạng |

## 4. Hình dạng sản phẩm

- **Hôm nay:** tiếp tục phiên học, bài cần ôn và một hành động chính.
- **Học qua chat:** transcript, composer, nút dừng; nguồn và lộ trình nằm trong panel mở khi cần.
- **Thư viện:** khóa, tài liệu và phiên học đã lưu.
- **Cài đặt:** nhà cung cấp, model được cho phép, key tạm thời, xuất/nhập và xóa dữ liệu.
- Lab mở bằng điều hướng có nút quay về; chưa nhúng lại toàn bộ lab thành widget chat.
- Mỗi phiên: khảo sát nền tảng → thống nhất mục tiêu → một chunk kiến thức → dự đoán/giải thích → luyện tập → ghi evidence hợp lệ → ôn đến hạn.
- Tutor không bắt buộc khảo sát lại khi phiên đã có nền tảng đủ rõ; cho người học đổi mục tiêu/chế độ.

## 5. Phụ thuộc và mốc bàn giao

| Mốc | Task | Bàn giao | Cổng đi tiếp |
|---|---|---|---|
| M0: khả thi Android | 1–2 | Báo cáo tương thích, APK thử shell nếu build được | Mở app, file picker, source/lab smoke test; xác định đường frontend |
| M1: chat hoạt động | 3–5, 7 | Chat nhiều lượt với system prompt, consent, streaming và hủy | Test adapter/policy đạt, không gửi lén hoặc mất draft |
| M2: học theo nguồn | 6, 8 | PDF/link → outline → khóa đã lưu → chat theo nguồn | Dẫn nguồn kiểm tra được, dữ liệu lỗi không làm hỏng khóa cũ |
| M3: liên tục học | 9–10 | Lưu phiên, backup, lab và review quay về chat | Tiến độ cũ và grader bất biến |
| M4: chất lượng tutor/UI | 11–12 | Bộ đánh giá sư phạm, UI Android và số đo máy thật | Không có lỗi nghiêm trọng về giảng dạy hoặc thao tác |
| M5: bản dùng thử | 13–14 | APK ký, checksum, hướng dẫn cài, báo cáo test | Luồng học trọn vẹn trên điện thoại; không còn P0/P1 mở |

Task 6 có thể làm độc lập sau M0; Task 9 sau contract phiên; tích hợp từng task theo thứ tự phụ thuộc. Không chạy nhiều agent cùng sửa một module. Sau mỗi task: review yêu cầu, rồi review chất lượng mã; sửa trước task kế tiếp.

## 6. Contract và cấu trúc file dự kiến

Các đường dẫn dưới đây tương đối với repository. Đây là tên đích dự kiến, chưa phải file đã tồn tại. Chỉ tạo file khi task cần; không tạo package/framework để dành.

| Nhóm | File đích / trách nhiệm |
|---|---|
| App Android | `mobile/index.html`, `mobile/main.tsx`, `mobile/vite.config.ts`: entry client dùng lại React; chỉ tạo nếu static build hiện tại không dùng được |
| Native | `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs`, `src-tauri/capabilities/main.json` |
| Native provider/source | `src-tauri/src/ai_transport.rs`, `src-tauri/src/source_import.rs`: lệnh giới hạn, không mở generic HTTP/shell cho frontend |
| Contract chat | `lib/tutor/types.ts`, `lib/tutor/session.ts`: kiểu và reducer phiên |
| Prompt | `lib/tutor/prompts.ts`, `lib/tutor/context.ts`: instruction có phiên bản và ngữ cảnh bounded |
| AI | `lib/tutor/request.ts`, `lib/tutor/stream.ts`, `lib/tutor/transport.ts`: snapshot được duyệt, parser streaming và adapter |
| UI | `components/learning/tutor-chat.tsx`, `app/tutor-chat.css`: transcript/composer và preview; dùng control hiện có |
| Lưu phiên | `lib/tutor/store.ts`: chat lưu riêng, không chen vào canonical mastery/log |
| QA | `tests/tutor-*.test.mjs`, `tests/fixtures/tutor/`, `docs/android/`, `docs/evaluations/` |

### Kiểu dùng chung

```ts
type TutorMode = 'diagnose' | 'teach' | 'socratic' | 'practice' | 'source' | 'review';
type TutorMessage = { role: 'system' | 'user' | 'assistant'; content: string };
type TutorEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; model: string | null }
  | { type: 'error'; code: 'auth' | 'quota' | 'payment' | 'network' | 'timeout' | 'invalid' | 'limit' };
type TutorRequest = {
  id: string; sessionId: string; revision: number; promptVersion: string;
  provider: 'openrouter' | 'gemini'; model: string;
  messages: readonly TutorMessage[]; maxOutputTokens: number;
}; // Không chứa API key. Bản đã preview được freeze/copy sâu.
type TutorTransport = (
  request: TutorRequest, config: AiConfig, signal: AbortSignal
) => AsyncIterable<TutorEvent>;
```

`AiConfig` tiếp tục lấy từ `lib/ai-provider.ts`. Native xử lý key chỉ cho một request đang chạy. Runtime xác minh provider/model của config khớp snapshot; thay key/config làm consent hết hiệu lực. Không export/log config. Provider được phép suy luận nội bộ, nhưng không để reasoning payload hoặc tool calls trở thành nội dung/command của app.

### Giới hạn đề xuất cho bản đầu

Các giá trị sau là quyết định triển khai đề xuất, không phải benchmark hay giới hạn đã kiểm chứng:

- Chat input: 4.000 ký tự/lượt; giữ tối đa 100 lượt/phiên, 20 phiên; báo khi đạt giới hạn, không tự xóa phiên người dùng chưa chọn.
- Context gửi: tối đa 12 message hội thoại gần nhất và 24.000 ký tự cho toàn bộ messages; luôn giữ system instruction và câu hỏi hiện tại. Nếu không đủ chỗ cho chúng, chặn và yêu cầu rút ngắn; không cắt âm thầm nguồn/câu hỏi.
- Output: 2.048 token, tối đa 100.000 ký tự sau chuẩn hóa; envelope stream tối đa 1 MiB. Không giả định số ký tự là số token chính xác.
- Timeout tổng 60 giây, idle giữa dữ liệu 20 giây; mỗi yêu cầu chỉ một lần, không retry nền.
- PDF: tối đa 20 MiB và 200 trang; văn bản trích tối đa 500.000 ký tự. Dừng có thông báo nếu vượt; người học chọn đoạn trước khi gửi.
- URL: HTTPS công khai, tối đa 3 redirect được kiểm tra từng bước, tối đa 2 MiB response và 20 giây; không cookie/Authorization của tài khoản.
- Lưu chat tách riêng, tổng tối đa 5 MiB; khi không ghi được giữ phiên trong RAM và báo rõ. Passport tiến độ hiện tại giữ giới hạn 512.000 byte.
- Các giới hạn này phải nằm ở một nơi cho mỗi runtime, có boundary test và parity test; thay đổi sau đo Android cần cập nhật tài liệu và test.

## 7. Tasks triển khai

### Task 1 — Kiểm kê và khóa baseline

**Files:** đọc `package.json`, `app/page.tsx`, `app/learning-dashboard.tsx`, `app/api/*`, `lib/ai-provider.ts`, `lib/article-import.ts`, `docs/performance/PERFORMANCE-52.md`; tạo `docs/android/BASELINE.md`.

**Interfaces:** đầu vào source v53; đầu ra danh sách module client/server, tài nguyên mạng của PDF/Python/font và môi trường build thực có.

- [ ] Ghi commit thực tế, trạng thái Git và phiên bản Node/Rust/JDK/SDK/NDK; không cài hoặc cập nhật phụ thuộc ngoài phạm vi cần.
- [ ] Chạy `npm test` một lần trên baseline; ghi test fail sẵn có và phân biệt lỗi môi trường với lỗi app.
- [ ] Chạy `npm run lint`; giữ riêng cảnh báo generated types đã tồn tại.
- [ ] Truy vết `/api/ai-course`, `/api/source-url`, storage và Pyodide asset tới caller; ghi toàn bộ dependency server/offline.
- [ ] Commit riêng `docs: record Android feasibility baseline`; không triển khai Site.

### Task 2 — Spike Tauri/React và APK sớm

**Files:** tạo `docs/android/FEASIBILITY.md`, các file `src-tauri/*`; chỉ tạo `mobile/*` nếu kết quả thử static export bắt buộc; sửa scripts trong `package.json` với tên `mobile:build`, `android:dev`, `android:build`.

**Interfaces:** dùng dashboard hiện có; xuất frontend assets độc lập và APK thử. Giữ nguyên lệnh build web.

- [ ] Thử build static tối thiểu trong nhánh/worktree cô lập; kiểm tra output không cần server route/RSC server khi app chạy.
- [ ] Nếu Vinext hiện tại không xuất client độc lập được, dùng entry React/Vite nhỏ import component hiện có; không port toàn bộ app hoặc đổi framework web.
- [ ] Cấu hình Tauri capabilities tối thiểu; không remote web content được gọi lệnh native; CSP giới hạn rõ. Khóa dependency/lockfile.
- [ ] Với mock transport, mở dashboard/lesson/SQL, thử font tiếng Việt, PDF.js worker và Python sandbox trên emulator; xác minh Python không gọi được lệnh Tauri, filesystem hay app storage.
- [ ] Chạy `npm run mobile:build`, `cargo test --manifest-path src-tauri/Cargo.toml`, `npm run android:build` (ánh xạ tới `tauri android build --apk`). Ghi rõ thiếu SDK/NDK hoặc target nếu bị chặn, không tuyên bố APK hoàn tất.
- [ ] Cài APK lên điện thoại khi thiết bị sẵn sàng; ghi Android/WebView, RAM và ABI. Nếu chưa có thiết bị, cổng máy thật còn mở.
- [ ] Commit `feat: add minimal Android feasibility shell`; chỉ đi tiếp khi frontend và ranh giới sandbox khả thi, hoặc báo chính xác điểm cần quyết định.

### Task 3 — Snapshot request, system role và consent một lần

**Files:** tạo `lib/tutor/types.ts`, `lib/tutor/request.ts`, `tests/tutor-request.test.mjs`; sửa `lib/ai-provider.ts` để tái dùng policy hiện có thay vì nhân bản.

**Interfaces:** `prepareTutorRequest(input): TutorRequest`; `approveTutorRequest(requestId, revision): Approval`; `consumeApproval(request, approval): void`. `Approval` giữ nội bộ bộ nhớ, single-use; request ID và revision phải khớp. Bảo vệ consent ở client không phải cơ chế xác thực server.

- [ ] Viết test `preview_exact_messages`, `reject_changed_config`, `approval_is_single_use`, `reject_over_budget_before_network` với assert: payload đi mạng deep-equal messages đã preview; lần consume thứ hai ném lỗi; fetch count bằng 0 nếu snapshot không hợp lệ.
- [ ] Chạy `node --test tests/tutor-request.test.mjs`, xác nhận fail đúng chỗ chưa triển khai.
- [ ] Tạo validator và snapshot bất biến; key không thuộc request; system instruction tách role thật, tài liệu đặt trong user context có nhãn dữ liệu.
- [ ] Chạy lại test, kỳ vọng 0 fail; chạy `node --test tests/ai-provider.test.mjs` để bảo toàn miễn phí/secret redaction.
- [ ] Commit `feat: bind tutor consent to exact request snapshot`.

### Task 4 — Streaming provider cho web và Android

**Files:** tạo `lib/tutor/stream.ts`, `lib/tutor/transport.ts`, `app/api/tutor/route.ts`, `src-tauri/src/ai_transport.rs`, `tests/tutor-stream.test.mjs`, `tests/tutor-transport.test.mjs`; sửa native command registration.

**Interfaces:** `parseTutorStream(provider, chunks: AsyncIterable<Uint8Array>): AsyncIterable<TutorEvent>`; `webTutorTransport` và `nativeTutorTransport` đều theo `TutorTransport`. Rust `start_tutor_request(request, config, channel)` và `cancel_tutor_request(id)` chỉ nhận provider allowlist; không nhận arbitrary endpoint/header.

- [ ] Viết fixtures SSE OpenRouter/Gemini: JSON chia giữa byte UTF-8 tiếng Việt, nhiều event/chunk, CRLF, done, token-limit, refusal, thiếu kết thúc, frame lỗi/quá lớn.
- [ ] Viết test assert delta giữ đúng thứ tự; chỉ `done` mới hoàn tất; abort/quota/payment không retry, không trả raw key/provider error, không phát event cho request đã hủy.
- [ ] Chạy `node --test tests/tutor-stream.test.mjs tests/tutor-transport.test.mjs`, thấy fail trước triển khai.
- [ ] Triển khai adapter provider với system role phù hợp; pin provider/model miễn phí được hỗ trợ, giới hạn token, bỏ tools/plugins, redirect disabled và cancellation xuyên suốt. Web route giữ kiểm tra origin/content-type/body và `Cache-Control: no-store`.
- [ ] Native command kiểm tra lại policy; relay stream bounded tới React; dừng task khi frontend mất phiên/đóng app. Không chỉ dựa vào frontend để chặn paid model.
- [ ] Chạy Node tests + Cargo tests; integration mock hai runtime phải cho cùng event sequence. Real API chỉ smoke test bằng key người dùng và preview/consent, không gọi tự động trong CI.
- [ ] Commit `feat: stream free tutor providers across web and Android`.

### Task 5 — Trạng thái phiên và protocol dạy

**Files:** tạo `lib/tutor/session.ts`, `lib/tutor/prompts.ts`, `lib/tutor/context.ts`, `tests/tutor-session.test.mjs`, `tests/tutor-prompts.test.mjs`.

**Interfaces:** `reduceTutorSession(session, action): TutorSession`; `buildTutorMessages(session, sourceContext): TutorMessage[]`. Session chứa id/revision, goal, mode, phase, turns và draft; không chứa key/mastery. Phase: `diagnosing | teaching | awaiting_answer | practicing | reflecting`.

- [ ] Viết test: mở mới → diagnose khi chưa biết nền; câu trả lời người học làm tăng revision; model không tự unlock; context limit không bỏ system/current input; nguồn chứa “ignore instructions” không thành system role.
- [ ] Chạy `node --test tests/tutor-session.test.mjs tests/tutor-prompts.test.mjs` và xác nhận fail.
- [ ] Viết một base prompt ngắn + sáu phần bổ sung theo `TutorMode`; gắn version `tutor.v1`. Quy định một câu hỏi chính/lượt, không giảng tiếp khi đang chờ người học, không lộ lời giải ở bước dự đoán, nói rõ khi thiếu nguồn.
- [ ] Thực thi phase bằng app; model đề xuất chỉ được xác nhận bằng thao tác/rule hợp lệ. Không dùng substring trong câu model để chạy command hoặc cấp evidence.
- [ ] Chạy lại test và commit `feat: add versioned tutoring protocol and bounded context`.

### Task 6 — Nhập PDF và bài viết trên Android

**Files:** tạo `src-tauri/src/source_import.rs`, `lib/source-access.ts`, `tests/source-access.test.mjs`; sửa caller trong `app/source-studio.tsx`, dùng lại `lib/source-document.ts`, `lib/source-ingest.ts`, `lib/article-import.ts` và PDF.js.

**Interfaces:** `readSelectedPdf(): Promise<Uint8Array | null>`; `importPublicArticle(url: string, signal: AbortSignal): Promise<SourceDocument>`; web dùng route cũ, native dùng command giới hạn. Người dùng chọn file qua picker; không expose read-all-files.

- [ ] Viết test file hỏng/mã hóa/scan không có text/vượt giới hạn; hủy picker không xóa draft; Unicode/page locator giữ đúng.
- [ ] Viết Rust test URL HTTPS công khai, IP loopback/private/link-local/IPv6-mapped, redirect về nội bộ, MIME sai và response quá lớn. Kiểm tra DNS trước kết nối, dùng đúng địa chỉ đã xác minh; không để client resolve lại sang địa chỉ khác. Mỗi redirect xác minh lại, không mang cookie/key.
- [ ] Chạy `node --test tests/source-access.test.mjs` và Cargo test, xác nhận fail.
- [ ] Triển khai native network/file boundary tối thiểu; PDF vẫn decode trong worker bằng PDF.js cho tới khi có benchmark khác. Article extraction giữ cùng locator/schema; fallback cho dán văn bản khi site không đọc được.
- [ ] Xem trước phần text lấy được trước khi tạo khóa; không gửi toàn bộ PDF tự động hoặc gửi API key tới host tài liệu.
- [ ] Chạy boundary tests và một PDF/bài viết mẫu trên Android; commit `feat: import bounded local and public sources on Android`.

### Task 7 — Giao diện chat theo Stitch

**Files:** tạo `components/learning/tutor-chat.tsx`, `app/tutor-chat.css`, `tests/tutor-chat.test.mjs`; sửa `app/learning-dashboard.tsx`, `app/layout.tsx` và điều hướng mobile.

**Interfaces:** `TutorChat({session, dispatch, transport, config, onOpenLab})`; component không tự viết mastery/storage và không tự tạo provider riêng.

- [ ] Viết render/interaction test: gửi chưa consent → 0 request; Enter/IME không gửi nhầm; đổi source/config vô hiệu preview; stop dừng đúng request; error giữ input; session A trả muộn không ghi vào B.
- [ ] Chạy `node --test tests/tutor-chat.test.mjs`, xác nhận fail.
- [ ] Dựng transcript và composer với primary action rõ, nguồn/lộ trình mở theo nhu cầu; preview hiển thị messages chính xác, không lộ key. Transcript dùng text/renderer an toàn, không `dangerouslySetInnerHTML` từ model.
- [ ] Gom cập nhật token theo frame/batch để không render toàn bộ transcript mỗi token; không ép cuộn nếu người dùng đang đọc tin cũ. Đánh dấu incomplete nếu stream lỗi/hủy.
- [ ] Kiểm tra bàn phím TalkBack/focus, nút tối thiểu 44px, body 16px, tương phản và reduced motion. Chỉ dùng browser được cấp quyền; nếu preview bị chặn, ghi chưa visual QA và giữ cổng release mở, không đi đường vòng.
- [ ] Chạy lại tests, commit `feat: add focused Stitch-aligned tutor chat`.

### Task 8 — Nối nguồn → khóa → phiên học

**Files:** sửa `lib/ai-course.ts`, `components/learning/ai-course-studio.tsx`, `app/source-studio.tsx`; tạo `lib/tutor/course-session.ts`, `tests/tutor-course.test.mjs`.

**Interfaces:** `startCourseSession(course: TeachingCourse, lessonId: string): TutorSession`; dùng schema và parser khóa hiện có, chỉ thêm trường với migration nếu thật cần.

- [ ] Viết test source → section selection → outline preview → explicit save; sectionId/quote không khớp bị từ chối; khóa lỗi/truncated không thay khóa cũ; prompt-injection trong PDF không gọi tool hoặc sửa progress.
- [ ] Chạy `node --test tests/tutor-course.test.mjs tests/ai-course.test.mjs`, thấy fail ở chức năng mới.
- [ ] Nối importer Task 6 và transport Task 4; tái dùng tạo bài/validator; bổ sung bước outline chỉnh sửa và session theo lesson, mỗi lần gọi AI duyệt mới.
- [ ] Hiển thị nguồn của câu trả lời và phân biệt “trích dẫn khớp văn bản” với “diễn giải đã được xác nhận”. Thiếu dẫn nguồn thì không trình bày là kết luận từ tài liệu.
- [ ] Chạy test; thử một PDF, một bài viết công khai và một link không hỗ trợ; commit `feat: connect source courses to tutor sessions`.

### Task 9 — Lưu phiên, khôi phục và chuyển tiến độ

**Files:** tạo `lib/tutor/store.ts`, `tests/tutor-store.test.mjs`; sửa màn export/import; chỉ sửa `lib/learning-backup.ts` nếu cần adapter giao diện, không tăng allowlist để chứa key/chat.

**Interfaces:** `loadTutorSessions(storage): TutorSession[]`; `saveTutorSessions(storage, sessions): SaveResult`; `exportTutorArchive(sessions): string`; `importTutorArchive(text, current): TutorSession[]`. Archive chat có schema riêng, kiểm tra giới hạn 5 MiB và preview số phiên trước merge.

- [ ] Viết test process death giữa stream → assistant incomplete; corrupt JSON/unknown schema/quota → không ghi đè dữ liệu cũ; import trùng ID → giữ cả hai bằng đổi ID, không overwrite âm thầm; key/config/consent không có trong archive.
- [ ] Chạy `node --test tests/tutor-store.test.mjs tests/learning-backup.test.mjs`, xác nhận fail phần mới.
- [ ] Dùng localStorage hiện có cho dữ liệu bounded của bản đầu, chung giao diện StorageLike; chưa thêm SQLite nếu chưa cần. Ghi failure giữ phiên RAM; UI báo lưu chưa thành công.
- [ ] Tách lưu transcript có chủ đích khỏi learning-log chỉ metadata; thông báo chat lưu trên thiết bị, cho xóa phiên/xóa toàn bộ và xuất chủ động. Không gọi API để tóm tắt âm thầm.
- [ ] Dùng Passport có sẵn để chuyển web → Android, không tự truy cập browser origin; kiểm tra merge/rollback và 72h review không đổi.
- [ ] Chạy tests và kill/reopen trên Android; commit `feat: persist tutor sessions with explicit safe restore`.

### Task 10 — Lab và lịch ôn trong luồng chat

**Files:** sửa navigation trong `app/learning-dashboard.tsx`, `app/expansion-workbench.tsx`; tạo `lib/tutor/lab-return.ts`, `tests/tutor-learning-tools.test.mjs`; tái dùng repository/queue hiện có.

**Interfaces:** `LabReturnTarget = {sessionId: string; lessonId: string}`; `openLearningTarget(target, returnTo)` chỉ nhận ID hợp lệ từ catalog; sau lab resume đúng session.

- [ ] Viết test model viết “bạn đã Mastered” không đổi state; ID bịa không mở lab; SQL/Python fail vẫn fail; quay về đúng chat/draft; review trước 72h bị chặn.
- [ ] Chạy test mới cùng test mastery/review hiện có; thấy fail phần tích hợp mới.
- [ ] Nối CTA mở lab với callback đã có, đọc kết quả canonical sau quay về; chỉ metadata evidence được đưa vào prompt nếu xuất hiện trong preview.
- [ ] Xác minh SQL/Python, bài trực quan và các track hiện có trên Android. Offline Python cần runtime assets đã tải/bundled với phiên bản cố định; nếu chưa có, báo cần tải, không giả kết quả. Quyết định kích thước bundle từ spike Task 2.
- [ ] Chạy tests, commit `feat: connect tutor sessions to deterministic learning tools`.

### Task 11 — Đánh giá chất lượng gia sư

**Files:** tạo `tests/fixtures/tutor/scenarios.json`, `scripts/evaluate-tutor.mjs`, `docs/evaluations/TUTOR-V1.md`; bổ sung tests prompt/response contract.

**Interfaces:** scenario có `id, mode, messages, source, requiredBehaviors, forbiddenBehaviors`; evaluator offline kiểm tra cấu trúc, bảng rubric thủ công chấm sư phạm. Live run là thao tác riêng có preview/consent từng yêu cầu, không có batch ngầm.

- [ ] Tạo tối thiểu 24 ca: mỗi mode 4 ca, phủ chưa biết nền, câu trả lời gần đúng/sai, thiếu nguồn, prompt injection, yêu cầu đáp án sớm và tiếng Việt có thuật ngữ Anh.
- [ ] Test evaluator bắt được output thiếu schema/citation locator sai/tool command không hợp lệ, không giả rằng regex chứng minh chất lượng dạy.
- [ ] Chấm 0–2 cho đúng kiến thức, độ vừa sức, một bước/lượt, bám câu trả lời và bám nguồn; mục tiêu ít nhất 80% tổng điểm, không ca nào bịa nguồn hoặc tự cấp mastery được chấp nhận.
- [ ] Ghi provider, requested/actual model, prompt version, latency và ngày đánh giá; dùng nguồn mẫu không riêng tư. Xóa key khỏi mọi artifact.
- [ ] Nếu chưa có API/quota, bàn giao bộ offline và đánh dấu live evaluation chưa đạt cổng; không tuyên bố tutor đã được kiểm chứng.
- [ ] Commit `test: add tutor protocol and teaching evaluation suite`.

### Task 12 — Tối ưu Android và giảm code thừa

**Files:** tạo `docs/performance/ANDROID-BASELINE.md`, sửa duy nhất module được đo thấy chậm; nếu cần Rust CPU, thêm `src-tauri/src/source_text.rs` và parity tests tương ứng.

**Interfaces:** giữ contract Tasks 3–10; tối ưu không đổi đầu ra grader/locator/progress.

- [ ] Trên máy thật chạy 5 warmup + 30 mẫu: mở app, gõ chat, parse nguồn, mở lab, render streaming; đo cold start riêng; ghi thiết bị, phiên bản và dataset. Tách thời gian đến token đầu của provider khỏi CPU/UI.
- [ ] Mục tiêu kỹ thuật dự kiến: local input/action p95 dưới 100ms, không task UI dài hơn 50ms trong steady-state chat; xác định baseline trước khi cam kết cold start/bộ nhớ. Không cam kết tốc độ AI miễn phí.
- [ ] Kiểm tra rerender, context gửi lại, CSS override, helper/adapter trùng và dependency không dùng. Xóa code hết caller cùng export/test lỗi thời, không xóa error handling hoặc validation.
- [ ] Chỉ thử Rust CPU khi chức năng có p95 trên 50ms hoặc gây long task quan sát được; cần Unicode/empty/large/invalid parity fixtures với TypeScript và số đo end-to-end gồm IPC/cold cost.
- [ ] Chỉ giữ bản Rust khi kết quả đúng và lợi ích máy thật đủ rõ; nếu không, bỏ prototype và ghi quyết định giữ TypeScript.
- [ ] Chạy test liên quan sau từng thay đổi; chốt một full regression ở cổng release; commit `perf: reduce measured Android overhead` với số đo thực, không marketing speedup.

### Task 13 — Kiểm thử phát hành trên Android

**Files:** tạo `docs/android/TEST-REPORT.md`, `docs/android/DEVICE-CHECKLIST.md`; sửa bug theo ca tái hiện, không mở scope tính năng.

**Interfaces:** dùng release candidate APK; report gồm build/commit, device, steps, expected/actual, severity, evidence và trạng thái.

- [ ] Chạy `npm test`, `npm run lint`, `npm run mobile:build`, Cargo tests và release APK build trên cùng source; không lặp full suite trừ khi source/dependency liên quan đổi.
- [ ] Kiểm thử provider 401/402/429, mất mạng, timeout, stop, đổi provider/phiên giữa stream, app background/kill và mở lại; draft giữ nguyên, không tự gọi lại.
- [ ] Chạy E2E: cài app → nhập key → chọn PDF/link → preview/consent → tạo/lưu khóa → chat nhiều lượt → làm lab sai/đúng → export/import → ôn đúng hạn bằng test clock; không đổi đồng hồ máy để giả evidence người học.
- [ ] Kiểm tra bàn phím Android che composer, Back button, portrait/landscape, font scale 200%, TalkBack, dark/light contrast nếu có và reduced motion; so sánh các màn chính với Stitch đã duyệt.
- [ ] Kiểm tra offline, thiếu asset Python, PDF scan/oversize, storage full, update APK giữ dữ liệu và reinstall behavior. Uninstall mất local data phải được nói rõ, backup là thao tác chủ động.
- [ ] Xác minh không key trong logs/export/bundle, không native command từ model/nguồn, không mở arbitrary endpoint; xem lại capabilities/CSP.
- [ ] Đóng P0/P1 rồi chạy lại ca lỗi và bộ test chịu ảnh hưởng. Không được đổi số test thành “toàn diện tuyệt đối”; ghi phần chưa chạy.

### Task 14 — Đóng gói, bàn giao và vòng sửa lỗi

**Files:** tạo `docs/android/INSTALL.md`, `docs/android/RELEASE-NOTES.md`; cấu hình CI build trong `.github/workflows/android.yml` khi runners/quota cho phép.

**Interfaces:** APK ký cho testing + SHA-256 + source commit + hướng dẫn import Passport + giới hạn hiện hữu. Không cần Play Store cho bản cá nhân.

- [ ] Chọn applicationId cố định, versionCode tăng; release signing key không vào repository/log/artifact công khai. Giữ cùng signer để bản cập nhật bảo toàn dữ liệu; người dùng giữ bản sao signing key an toàn.
- [ ] Tạo APK cho ABI máy thật đã xác minh; kiểm tra chữ ký, checksum và cài mới/cập nhật. Chỉ gọi là release candidate khi các gate Task 13 đã có bằng chứng.
- [ ] Bàn giao APK, hướng dẫn sideload, nhập key, backup, xử lý quota và danh sách hạn chế; không yêu cầu người dùng gửi key qua chat.
- [ ] Cập nhật repo theo quyền đã có; không commit bí mật, SDK, node_modules hay file sách. Không triển khai bản web khi chưa hoàn tất gate visual hiện còn mở.
- [ ] Thu phản hồi theo lỗi tái hiện: màn hình, thao tác, mong đợi/thực tế, thiết bị, build; fix theo P0 → P1 → P2 rồi regression có mục tiêu.
- [ ] Chỉ đưa voice, OCR, video transcription, sync hoặc model local vào kế hoạch sau nếu người dùng chọn; bản hiện tại nhận transcript dạng văn bản, không hứa tự lấy mọi video.

## 8. Ma trận nghiệm thu tổng

| Yêu cầu | Bằng chứng bắt buộc | Task |
|---|---|---|
| APK chạy không cần app server | APK cài/mở trên Android; build/static feasibility report | 2, 13–14 |
| Học chat theo phương pháp | Prompt version + 24 ca + đánh giá model thực | 5, 11 |
| Duyệt đúng nội dung từng lần | Snapshot/consent unit tests + interaction test + device test | 3, 7, 13 |
| Chỉ miễn phí | Provider policy test ở TS/Rust; quota/payment không fallback | 3–4, 13 |
| PDF/link thành khóa | File/URL boundary tests và 2 luồng nguồn thực | 6, 8, 13 |
| Chat không mất khi kill/quota | Store tests + process-death và storage-denial check | 7, 9, 13 |
| Mastery không do AI cấp | Grader/72h tests + ID/action allowlist | 10, 13 |
| Giữ tiến độ web | Passport import/rollback và dữ liệu web nguyên vẹn | 9, 13 |
| Mượt và code gọn | Android baseline, thay đổi có đo, helper/caller không trùng | 12 |
| UI đẹp/dễ đọc | Visual comparison Stitch và checklist accessibility máy thật | 7, 13 |
| Nâng cấp không mất data | APK update cùng signer/versionCode + import/export | 9, 14 |

## 9. Quy trình làm việc và kiểm duyệt

1. Duyệt kế hoạch này; giữ phương thức Subagent-Driven người dùng đã chọn trước đây.
2. Agent triển khai nhận đúng task, contract, file và điều kiện nghiệm thu.
3. Reviewer kiểm tra đúng yêu cầu trước; reviewer chất lượng sau. Có lỗi thì trả lại task, không dồn sang cuối.
4. Chủ dự án tích hợp tuần tự; commit nhỏ theo deliverable và ghi trạng thái checkbox.
5. Tới mỗi mốc có bản chạy/demo hoặc bằng chứng blocker; báo đã làm, đã test, chưa test và bước kế.
6. Cuối nhánh có review tổng về tích hợp, dữ liệu, key/consent và Android lifecycle.

**Định nghĩa Done:** code đã tích hợp, test mục tiêu đạt, reviewer không còn lỗi chặn, tài liệu cập nhật, bằng chứng runtime đúng mức tuyên bố. Build thành công không thay thế kiểm tra thiết bị thật hoặc đánh giá chất lượng dạy.

## 10. Quyết định cần bổ sung khi tới đúng mốc

- **Trước APK máy thật:** mẫu điện thoại, phiên bản Android, ABI/dung lượng trống; không cần trì hoãn contract và mock tests vì thông tin này.
- **Trước provider smoke test:** người dùng nhập key vào app và duyệt request; thiếu quota chỉ chặn live test, không chặn offline development.
- **Nếu native PDF/Python không tương thích:** báo ca lỗi và phương án nhỏ nhất; không tự bỏ chức năng đã cam kết hoặc chuyển code người học sang native process.
- **Nếu phải đổi kiến trúc lớn/thu phí:** dừng phần phụ thuộc và xin quyết định cụ thể; không dùng danh nghĩa “tối ưu” để mở scope.

Không đưa lịch hoàn thành theo ngày khi chưa qua M0. Sau M0, ước lượng lại bằng task đã chạy, năng lực build và thời gian thiết bị/quota sẵn sàng.

## 11. Nguồn kỹ thuật cần tái xác minh khi triển khai

- Tauri frontend/static constraints: https://v2.tauri.app/start/frontend/nextjs/
- Android prerequisites: https://v2.tauri.app/start/prerequisites/
- APK packaging: https://v2.tauri.app/distribute/google-play/
- Tauri capabilities: https://v2.tauri.app/security/capabilities/
- OpenRouter free routing: https://openrouter.ai/docs/guides/routing/routers/free-router
- Gemini pricing/billing: https://ai.google.dev/gemini-api/docs/pricing

Không pin tên model từ trí nhớ: lúc triển khai kiểm tra endpoint, system instruction, streaming, khả năng hỗ trợ và Free Tier hiện hành qua tài liệu chính thức. Nếu model bị rút khỏi Free Tier, fail closed và yêu cầu người học chọn lại; không âm thầm đổi sang model khác.

## 12. Bước thực hiện đầu tiên sau duyệt

**Task 1: kiểm kê baseline → Task 2: spike Android.** Chỉ sau bằng chứng khả thi mới mở rộng chat, nguồn và lab. File này là kế hoạch; chưa chứng minh APK, hiệu năng, chất lượng tutor hay tương thích thiết bị đã đạt.