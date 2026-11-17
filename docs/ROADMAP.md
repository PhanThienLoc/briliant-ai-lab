# Roadmap

Kế hoạch triển khai bám theo nguyên tắc: chứng minh vòng lặp học tập trước, mở rộng catalog sau.

## Trạng thái hiện tại

- Tuần 1 — hoàn thành: PRD, kiến trúc, lesson schema và CI.
- Tuần 2 — hoàn thành MVP: runtime data-driven hỗ trợ choice, number, explanation và Python thực thi thật; có hint ladder và evidence ledger.
- Tuần 3 — hoàn thành bản nội dung đầu: đủ 14 lesson, mỗi lesson có 5 hoạt động, mental model, transfer test và nguồn.
- Tuần 4 — hoàn thành MVP: 14 Python Code Lab chạy trong Web Worker dùng một lần, chấm bằng 42 hidden tests, timeout 2,5 giây và chặn import/file/network.
- Tuần 5 — hoàn thành MVP: mastery engine dùng evidence thật, migration tiến độ cũ, hint/retry penalty và 14 delayed-transfer review sau ≥72 giờ.
- Tuần 6 — hoàn thành MVP: review scheduler đưa bài chờ/đến hạn lên Learning Hub và chỉ mở Mastered sau delayed recall đúng.
- Diagnostic — hoàn thành MVP: 10 câu trên 5 trục tạo baseline, chỉ ra knowledge gap sớm nhất và đề xuất lesson bắt đầu; kết quả không được dùng để cấp mastery.
- Explanation Defense + Code Coach — hoàn thành: explanation grader chặn sao chép hint/từ khóa; 14 Code Coach hỗ trợ học cú pháp nhưng mastery vẫn yêu cầu code độc lập.
- Tuần 7 — hoàn thành cổng tự động: kiểm tra 14 lesson, 70 activity, 42 misconception, 42 hidden test, source locator và accessibility contract trong mọi production build.
- Còn lại của Tuần 7: human read-through và tự xem lại scoring dispute; automation không được tự nhận đã review thay con người.
- Tuần 8 — hoàn thành local-first: bỏ database/telemetry, giữ toàn bộ state trên thiết bị và thêm Personal Learning Mirror.
- Interactive Visuals — hoàn thành nền tảng: sáu mechanism lab phủ đủ 14 lesson, đồng bộ control, số, đồ thị và câu hỏi dẫn đường.
- Data Portability — hoàn thành: Learning Passport xuất/kiểm tra/khôi phục tiến độ bằng JSON allowlist ≤500 KB, có rollback nếu ghi thất bại.
- Explanation Repair Loop — hoàn thành: phản hồi theo mắt xích nhân quả, chặn hint paste kể cả khi thêm câu nối hời hợt, và đưa lỗi vào hàng đợi luyện lại cục bộ; vượt lại sẽ tự xóa món nợ.
- Explanation Calibration — hoàn thành: 56 câu trả lời biên phủ 14 lesson, gồm canonical, synonym, hint-copy và fluent-but-incomplete; production build chặn cả false reject lẫn false accept trên bộ chuẩn này.
- R1/R2/R3 learning graph — hoàn thành: 16 lab chia thành các nhánh prerequisite; tám prerequisite edge có transfer check riêng, practice evidence tự xếp delayed review sau 72 giờ và review R0–R3 cùng xuất hiện trên Learning Hub.
- R2 relational/structure runtime — hoàn thành mốc nâng cao: SQL sandbox thực thi INNER/LEFT/RIGHT/FULL OUTER JOIN, GROUP BY, HAVING, aggregate và scalar subquery một tầng; queue và BFS được chấm bằng toàn bộ state-transition trace.
- R4 vertical slice — hoàn thành mốc đầu: 5 lab Dense/ReLU, backprop, token/embedding, self-attention và AI system evaluation; hai nhánh prerequisite hội tụ ở quality–latency–cost gate, dùng chung evidence và delayed review.
- Release parity — checkpoint production-ready: bản sửa tương phản brutalist và R4 vertical slice cùng nằm trên một commit đã qua toàn bộ release gate.
- Adaptive Mastery Foundation — phần triển khai đã có: repository chuẩn hóa evidence R0–R4, concept snapshot, mastery/risk gate, Today Queue có lý do và Learning Hub dùng lại các runtime hiện tại. Cổng lint, authoring audit, production build và regression đã đạt; kiểm tra tương tác trực tiếp trên trình duyệt vẫn cần thực hiện. Chưa có kết quả pilot bảy ngày để kết luận hiệu quả học tập.
- Misconception Error Clinic — đã triển khai cho 14 câu giải thích R0: mỗi mục cần sửa có phản ví dụ và câu biến thể riêng; chỉ xóa khỏi hàng đợi sau khi người học viết lại lời giải gốc đạt rubric. Đã thử trực tiếp chuỗi sai → sửa biến thể → giải thích lại → hàng đợi về 0.
- R4 calibration — đã bổ sung kiểm tra biên cho cả năm mô phỏng Dense/ReLU, backprop, token/embedding, attention và AI evaluation vào regression của CI. Human read-through 21 lab R1–R4 và tự xem lại scoring dispute vẫn cần người học hoặc reviewer thực hiện trước khi tuyên bố nội dung đã được kiểm chứng đầy đủ.
- Source Studio 2.0 — đã có bước duyệt bản nháp trước khi lưu: chọn ít nhất hai đoạn mẫu, chỉnh tên/mục tiêu bài, đối chiếu câu hỏi và đáp án với nguồn. Giữ nguyên ID, excerpt, locator và thứ tự nguồn; thư viện đầy được báo rõ thay vì tự bỏ khóa cũ. Đây vẫn là công cụ lấy mẫu và kiểm tra nhận biết ý trong nguồn, chưa phải hệ thống tự sinh toàn bộ khóa học hoặc chấm mục tiêu mở.
- Source Studio structured passages — đã triển khai: Markdown tách theo heading và dẫn đúng tên mục; SRT/VTT gom các cue liên tiếp, giữ timestamp đầu–cuối và loại metadata khỏi nội dung câu hỏi. Văn bản thường giữ ranh giới đoạn thay vì nối các đoạn rời; tối đa sáu đoạn được lấy mẫu theo thứ tự nguồn. Đáp án nhiễu xuất hiện trong cùng excerpt bị loại để tránh câu hỏi nhiều đáp án theo nguồn. Đây là kiểm tra khớp văn bản, chưa xác minh tương đương ngữ nghĩa.
- Milestone tiếp theo: câu hỏi suy luận có bằng chứng và pilot học thật bảy ngày; chỉ mở R5 khi retention và transfer có bằng chứng.

## Release 0 — MVP tám tuần

| Tuần | Mục tiêu | Kết quả kiểm chứng |
|---|---|---|
| 1 | Khóa phạm vi và nền tảng | PRD, kiến trúc, schema lesson, CI |
| 2 | Lesson runtime | Predict, manipulate, response và feedback theo lỗi |
| 3 | Khóa đầu tiên | 14 lesson *Từ dữ liệu thô đến mô hình biết học* |
| 4 | Code lab an toàn | Bài Python có giới hạn tài nguyên và test ẩn |
| 5 | Mastery engine | State machine, hint penalty, evidence ledger |
| 6 | Review scheduler | Ôn biến thể sau ít nhất 72 giờ |
| 7 | Authoring QA | Cổng tự động + 56 calibration case + repair queue đã đạt; human read-through còn chờ |
| 8 | Personal lab | Local-only state, Learning Passport, learning mirror và sáu họ trực quan tương tác |

## Các release kế tiếp

| Release | Trọng tâm | Điều kiện mở khóa |
|---|---|---|
| R1 | Logic, xác suất, đại số tuyến tính | 5 lab, hai nhánh prerequisite và delayed review ≥72 giờ đã hoạt động |
| R2 | Thuật toán, cấu trúc dữ liệu, SQL | 6 lab; outer join/HAVING/scalar subquery và state-transition grader đã hoạt động |
| R3 | ML, đánh giá mô hình, data mining | 5 playground có prerequisite và delayed review đã hoạt động |
| R4 | Deep learning, LLM, AI Engineering | 5 mechanism lab và evaluation gate đã hoạt động; calibration biên trong CI đã đạt, human review còn chờ |
| R5 | Data engineering, warehouse, distributed systems | Có project lab và grader cho hệ thống nhiều bước |

## Chỉ số quyết định tiếp tục

- Activation: bản thân hoàn thành diagnostic và hoạt động tương tác đầu tiên.
- Learning: evidence score tăng mà hint dependency không tăng theo.
- Retention: giải đúng bài delayed review sau tối thiểu 72 giờ.
- Transfer: áp dụng concept vào code, data hoặc system scenario mới.
- Quality: không có lỗi đáp án nghiêm trọng; lesson có nguồn và misconception map.
- Reliability: tỷ lệ lỗi runtime và code lab nằm dưới ngưỡng vận hành đã đặt.

Mọi production build phải chạy `scripts/audit-content.mjs`. Cổng này ngăn phát hành khi catalog thiếu source đã kiểm chứng, outcome/misconception map, rubric hợp lệ, Code Coach, hidden tests, interactive mechanism family hoặc accessibility contract.

Không tăng số khóa học nếu retention và transfer của khóa hiện tại chưa đạt ngưỡng tự đặt.
