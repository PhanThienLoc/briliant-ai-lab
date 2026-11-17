# Architecture

## Direction

Release 0 is content-driven and deterministic at its core. An AI tutor is an assistive boundary, not the source of truth for scoring or mastery.

## Layers

1. **Experience:** responsive Next.js/Vinext interface and reusable activity components.
2. **Content:** versioned JSON/MDX validated against schemas.
3. **Learning domain:** attempts, evidence, misconceptions, mastery transitions, and review scheduling.
4. **Execution:** browser-isolated Python for bounded educational labs and a deterministic local read-only relational SQL interpreter for R2.
5. **Tutor:** provider-abstracted structured responses grounded in activity state and sources.
6. **Persistence:** `localStorage` giữ toàn bộ tiến độ, lịch ôn và learning trace trên đúng thiết bị của người học.
7. **Reflection:** Personal Learning Mirror tổng hợp evidence, retry, hint dependency, code failure và scoring dispute hoàn toàn trong trình duyệt.

## Single-device persistence boundary

- Không có tài khoản ứng dụng, database, telemetry endpoint hay đồng bộ đa thiết bị.
- Learning log cục bộ giữ tối đa 400 metadata event; không lưu câu trả lời tự luận, code hoặc stdout.
- Tiến độ lesson, diagnostic và lịch delayed review dùng các key có phiên bản trong `localStorage`.
- Gỡ dữ liệu trình duyệt đồng nghĩa mất tiến độ; đây là đánh đổi có chủ ý cho phạm vi một người dùng.
- Personal Learning Mirror chỉ phản chiếu hành vi; nó không có quyền cấp mastery.
- Learning Passport chỉ xuất các key BriliantAI được allowlist, giới hạn 500 KB và kiểm tra JSON trước khi ghi.
- Restore là thao tác merge có rollback: không xóa key hiện tại không có trong backup và trả lại giá trị cũ nếu một lần ghi thất bại.
- Repair queue giữ tối đa 50 metadata item; không lưu nguyên văn câu tự luận. Learning Passport mang theo queue này để checkpoint không mất “món nợ” học tập.
- Tiến độ 11 lab R1/R2, prerequisite-edge evidence và review schedule dùng một key có phiên bản và được đưa vào Learning Passport; vẫn không có user account hoặc đồng bộ nền.

## Adaptive mastery boundary

- `LearningRepository` (`lib/learning-repository.ts`) is the Hub's boundary for reading and normalizing versioned browser state. The existing lesson and lab runtimes still write their own progress.
- Existing R0 lesson and R1–R4 expansion progress keys remain the canonical evidence stores. `briliantai.adaptive-state.v1` holds bounded preferences and session metadata, not duplicate mastery evidence; Learning Passport validates and carries that key.
- `lib/concept-evidence.ts` projects a detached concept snapshot from normalized progress. It contains evidence gates and bounded metadata, never raw learner answers, code, stdout, or personal text.
- `lib/adaptive-mastery.ts` computes the canonical mastery state from explicit practice, variant, transfer, delayed-retrieval, and unresolved-misconception gates. Hint dependency, repeated attempts, stale evidence, open misconceptions, and prerequisite blocks are separate risk flags. Tutor output cannot grant mastery.
- `lib/today-queue.ts` ranks review, repair, prerequisite bridge, and practice candidates deterministically for the same repository snapshot and injected clock. Each recommended action states its reason and required evidence; the default session budget is 30 minutes.
- The Hub starts from a hydration-safe empty shell. Storage denial retains the current in-memory session and shows a persistent warning; queue calculation failure retains normalized evidence and falls back to due reviews, then repair items. Neither failure grants mastery.

## R1/R2 expansion boundary

- R1 có hai nhánh: logic → xác suất có điều kiện → Bayes; vector → linear transform. Một lab khóa cho đến khi prerequisite có practice evidence và từng edge nối sang nó đã vượt transfer check.
- Mỗi lần practice đạt sẽ giữ mốc hoàn thành đầu tiên và xếp một biến thể sau 72 giờ. Practice và delayed mastery là hai trạng thái riêng; retry không thể đẩy lại due time.
- R2 có SELECT → JOIN/aggregate → advanced relations và queue → BFS, cùng Big-O độc lập. Grader kiểm tra bảng kết quả hoặc toàn bộ state-transition trace, không so khớp câu trả lời mẫu.
- SQL sandbox hiểu hai bảng allowlist, `INNER/LEFT/RIGHT/FULL OUTER JOIN`, `WHERE` với `AND`, `GROUP BY`, `HAVING`, scalar aggregate subquery một tầng, `COUNT/SUM/AVG/MIN/MAX`, `ORDER BY` và `LIMIT`. Parser không dùng `eval`, không có file/network/database và từ chối mutation hoặc nhiều statement.
- Alias bảng, correlated/nested subquery, CTE, window function, `OR` và mutation chưa được hỗ trợ. Các giới hạn này được nói rõ trong UI thay vì giả làm một SQL engine tổng quát.
- Learning Hub hợp nhất review schedule R0/R1/R2, sắp bài đến hạn trước rồi theo thời điểm due; click review R1/R2 mở trực tiếp delayed-transfer card của đúng lab.

## Explanation grading and repair boundary

- Grader không cấp điểm từ việc xuất hiện vài từ khóa. Nó cần đủ thành phần, một quan hệ nhân quả trong cùng mệnh đề và dấu hiệu diễn đạt độc lập.
- Hint defense kết hợp exact-copy, chuỗi bốn từ liên tiếp, độ phủ token nguồn, độ lặp và cấu trúc nhân quả; thêm một câu nối hời hợt sau phần hint không thể đổi kết quả.
- Feedback ưu tiên một cuộc đối thoại ngắn: xác nhận phần đã hiểu, chỉ ra một mắt xích còn đứt và đưa đúng một bước sửa nhỏ nhất.
- Mỗi lần không đạt upsert một item theo `lessonId:activityId`; không nhân bản cùng một lỗi. Khi vượt lại activity, item được xóa tự động.
- Scoring dispute chỉ đánh dấu item để người học tự xem lại rubric; nó không tự sửa điểm hoặc cấp mastery.
- Mỗi explanation activity có concept groups chứa thuật ngữ chuẩn và cách nói tương đương; grader chấm theo nhóm ý nên không ép người học lặp đúng một từ khóa.
- Calibration gate hiện có 56 ca: hai câu được chấp nhận và hai câu bị từ chối cho mỗi lesson. Bất kỳ false reject hoặc false accept nào cũng làm production build thất bại.

## Interactive explanation boundary

- Mỗi lesson được ánh xạ vào một mechanism lab: Data Lens, Function Machine, Dot Product, Error Lab, Gradient Descent hoặc Generalization Lab.
- Control làm nhiều biểu diễn cập nhật đồng thời: số, đồ thị, contribution/residual và câu diễn giải.
- Mỗi lab có câu hỏi dẫn đường hoặc thử thách cụ thể; không dùng sandbox trống bắt người học tự đoán mục tiêu.
- Motion chỉ biểu diễn chuyển trạng thái/cơ chế và vẫn tuân theo `prefers-reduced-motion`.

## Authoring quality boundary

`scripts/audit-content.mjs` chạy trước mọi production build và kiểm tra đồng thời catalog, delayed review, Python lab, Code Coach, 56 explanation calibration case, outcome/misconception map, source registry và accessibility contract. Source locator hiện được đối chiếu với ba tài liệu tham chiếu đã cung cấp; file sách và nội dung có bản quyền không được đóng gói vào Site.

Automated QA chỉ có quyền chặn lỗi cấu trúc và bất biến đã mã hóa. Nó không thay thế human read-through, đánh giá độ dễ hiểu hoặc calibration bằng các câu trả lời biên.

## Core entities

- `concepts`
- `concept_prerequisites`
- `courses`
- `lessons`
- `activities`
- `activity_variants`
- `attempts`
- `misconceptions`
- `mastery_states`
- `review_queue`
- `projects`
- `project_artifacts`
- `sources`
- `tutor_events`

## Mastery invariant

The tutor cannot directly set mastery. `mastered` requires:

- standard problem correct without hints;
- variant correct;
- transfer correct;
- delayed retrieval correct after at least 72 hours;
- no unresolved critical misconception.

The initial implementation is in `lib/mastery.mjs` and is intentionally small enough to audit.

## Security boundaries

- Never execute arbitrary learner code in the application server process.
- Python labs run in a disposable Web Worker with Pyodide/WebAssembly, never in the UI thread or application server.
- The learner AST rejects imports, ambient introspection, private/dunder attributes, files, dynamic evaluation, async constructs, and oversized literals/ranges before execution.
- Each submission has a 5,000-character ceiling, capped stdout, and a 2.5-second execution deadline. Timeout terminates the whole worker.
- The worker disables `fetch` after the Python runtime boots. It has no DOM or local-storage access and is discarded after every result.
- Hidden tests are hidden from the editor and normal product UI, but remain client-delivered assets. They deter answer-by-keyword and casual answer inspection; they are not cryptographically secret. High-stakes grading must move tests to a server-side microVM/container grader.
- Treat lesson JSON, tutor output, and learner text as untrusted input.
- Do not expose book files or copyrighted source pages through the product.
- Use least-privilege access for tools, data, and future agent actions.
- Preserve only bounded local evaluation metadata; never persist raw explanations, learner code, email, or full runtime output in the learning log.

## Decision log

- Web/PWA before native mobile.
- Git-versioned content before CMS.
- Rule-based adaptation before knowledge-tracing ML.
- Original lesson writing with source metadata.
- Provider abstraction for fast-changing AI APIs.
- Real behavioral grading before AI-generated scoring: 14 Python activities currently execute against 42 deterministic hidden tests.
- Single-device local-first state instead of accounts, server database, analytics, or social features.
