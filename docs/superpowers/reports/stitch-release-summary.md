# BrilliantAI — giao diện đã duyệt

## Đã triển khai

- Hôm nay, Thư viện, Tạo khóa học, Workspace tập trung và Ôn tập cùng hệ màu giấy sáng/xanh lá.
- Thư viện tìm kiếm tiếng Việt không dấu, lọc nguồn, mở bài và hiển thị tiến độ thật.
- Tạo bản nháp từ nguồn, sửa tên/mục tiêu, chọn ít nhất hai bài rồi lưu. Engine hiện lấy mẫu tối đa sáu đoạn, chưa sinh khóa học bao phủ toàn bộ sách bằng AI.
- Workspace có outline được khóa theo bằng chứng, mô hình tương tác, phản hồi và hướng dẫn thật. Mobile thu gọn hai cột phụ; chuyển bước đưa focus tới câu hỏi mới.
- Ôn tập giữ đúng khóa học/bài, thời gian72 giờ và các gate độc lập. Lỗi đọc dữ liệu có cảnh báo/thử lại, không bị coi là hàng đợi trống.

## Kiểm chứng

Build, lint và154/154 regression đạt. SQL thiếu điều kiện bị loại1/3 dataset; truy vấn đúng đạt3/3. Đã thử dán nguồn, duyệt/sửa/lưu, tìm/lọc, trả lời và reload giữ đúng tiến độ. Desktop/390px, focus, disclosure, Python và route quay lại đã được kiểm tra. Chi tiết và giới hạn nằm trong stitch-final-verification.md.

## Các quyết định đã chốt

1. Khôi phục và tiếp tục đúng kế hoạch đã duyệt, không hỏi duyệt lại; nếu hiểu sai sẽ cần chỉnh hoặc hoàn tác giao diện.
2. Dùng luồng dán văn bản thay hộp chọn tệp đã bị kẹt; thao tác chọn tệp trực tiếp chưa được xác minh trong phiên này.
3. Lưu Git bundle và các checkpoint riêng trước phát hành; đổi lại số phiên bản lưu tăng lên, bản đang chạy được giữ đến lúc bàn giao.
4. Tiếp tục quyền đã duyệt cho việc đẩy source/lưu/phát hành; nếu đích triển khai không đúng có thể quay về phiên bản đã lưu trước, không thay quyền truy cập.
5. Giữ chú thích trạng thái Code Coach ở14px, nội dung hướng dẫn chính16px; nếu cách phân loại này không đúng mong muốn, một chú thích phụ còn nhỏ hơn2px. Có một khai báo CSS16px cho footnote đang bị quy tắc metadata ghi đè; để lại như cleanup nhỏ, không ảnh hưởng học hay dữ liệu.
6. Dùng đích Site đã được duyệt thay cho hỏi lại lựa chọn tích hợp Git; giữ nhánh/bundle cục bộ làm điểm phục hồi, vẫn có thể rollback phiên bản Site.

Đích triển khai giữ nguyên: https://briliant-ai-lab.chatgpt-busi-4904.chatgpt.site . Kết quả phát hành và phiên bản cuối được xác nhận từ Sites.
