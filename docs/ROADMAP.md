# Roadmap

Kế hoạch triển khai bám theo nguyên tắc: chứng minh vòng lặp học tập trước, mở rộng catalog sau.

## Trạng thái hiện tại

- Tuần 1 — hoàn thành: PRD, kiến trúc, lesson schema và CI.
- Tuần 2 — hoàn thành MVP: runtime data-driven hỗ trợ choice, number, explanation và Python thực thi thật; có hint ladder và evidence ledger.
- Tuần 4 — hoàn thành MVP: 14 Python Code Lab chạy trong Web Worker dùng một lần, chấm bằng 42 hidden tests, timeout 2,5 giây và chặn import/file/network.
- Tuần 3 — hoàn thành bản nội dung đầu: đủ 14 lesson, mỗi lesson có 5 hoạt động, mental model, transfer test và nguồn. Nội dung vẫn cần authoring QA trước pilot.
- Tuần 5 — hoàn thành MVP: mastery engine dùng evidence thật, migration tiến độ cũ, hint/retry penalty và 14 delayed-transfer review sau ≥72 giờ.
- Tuần 6 — hoàn thành MVP: review scheduler đưa bài chờ/đến hạn lên Learning Hub và chỉ mở Mastered sau delayed recall đúng.
- Diagnostic — hoàn thành MVP: 10 câu trên 5 trục tạo baseline, chỉ ra knowledge gap sớm nhất và đề xuất lesson bắt đầu; kết quả không được dùng để cấp mastery.
- Milestone kế tiếp: authoring QA cho 14 lesson, pilot nhỏ và đo tỷ lệ lỗi/timeout của Python runtime.

## Release 0 — MVP tám tuần

| Tuần | Mục tiêu | Kết quả kiểm chứng |
|---|---|---|
| 1 | Khóa phạm vi và nền tảng | PRD, kiến trúc, schema lesson, CI |
| 2 | Lesson runtime | Predict, manipulate, response và feedback theo lỗi |
| 3 | Khóa đầu tiên | 14 lesson *Từ dữ liệu thô đến mô hình biết học* |
| 4 | Code lab an toàn | Bài Python có giới hạn tài nguyên và test ẩn |
| 5 | Mastery engine | State machine, hint penalty, evidence ledger |
| 6 | Review scheduler | Ôn biến thể sau ít nhất 72 giờ |
| 7 | Authoring QA | Kiểm tra nguồn, đáp án, misconception và accessibility |
| 8 | Pilot | 20–50 người học, đo activation, completion và delayed recall |

## Các release kế tiếp

| Release | Trọng tâm | Điều kiện mở khóa |
|---|---|---|
| R1 | Logic, xác suất, đại số tuyến tính | R0 đạt chất lượng học và ổn định kỹ thuật |
| R2 | Thuật toán, cấu trúc dữ liệu, SQL | Review loop chứng minh cải thiện retention |
| R3 | ML, đánh giá mô hình, data mining | Có authoring pipeline và rubric nhất quán |
| R4 | Deep learning, LLM, AI Engineering | Sandbox code/model đủ an toàn và quan sát được |
| R5 | Data engineering, warehouse, distributed systems | Có project lab và grader cho hệ thống nhiều bước |

## Chỉ số quyết định tiếp tục

- Activation: hoàn thành pretest và hoạt động tương tác đầu tiên.
- Learning: tăng điểm giữa pretest và bài biến thể tương đương.
- Retention: giải đúng bài delayed review sau tối thiểu 72 giờ.
- Transfer: áp dụng concept vào code, data hoặc system scenario mới.
- Quality: không có lỗi đáp án nghiêm trọng; lesson có nguồn và misconception map.
- Reliability: tỷ lệ lỗi runtime và code lab nằm dưới ngưỡng vận hành đã đặt.

Không tăng số khóa học nếu retention và transfer của khóa hiện tại chưa đạt ngưỡng pilot.
