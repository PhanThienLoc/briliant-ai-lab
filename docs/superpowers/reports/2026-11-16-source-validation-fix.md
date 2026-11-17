# Source validation — sửa lỗi và xác minh

## Phạm vi

Thực hiện Task 1 của `docs/superpowers/plans/2026-11-16-source-foundation.md`, tiếp theo checkpoint `330c3f9292dfc049b8a1a11432e8cf48c1c55ec8`.

## Đã sửa

- Dùng chung validation cho parser và API ghi tiến độ; review không thể vượt chốt bằng ngày hỏng, thiếu completedAt hoặc dueAt sớm hơn completedAt +72 giờ.
- Kiểm tra createdAt, completedAt, reviewDueAt, reviewedAt là ngày hữu hạn; reviewedAt không thể trước hạn ôn. Ngày hiện tại không hợp lệ cũng bị chặn.
- Từ chối mục tiêu/vị trí dẫn nguồn trống hoặc thiếu; từ chối ID khóa học trùng và ID bài học trùng trong cùng khóa.
- Làm lại bài đã hoàn thành giữ nguyên completedAt/reviewDueAt/reviewedAt. Không dời lịch ôn hay xóa bằng chứng đã có.
- UI báo lỗi nếu ghi tiến độ thất bại; không để exception thoát từ submit.
- Dữ liệu v1 hợp lệ giữ nguyên ID và timestamp. Dữ liệu hỏng bị báo lỗi, không tự sửa hay ghi đè. Backup import dùng cùng validator.

## Kiểm chứng mới

| Cổng | Kết quả |
| --- | --- |
| Kiểm thử trước sửa trên source gốc với fixture đã chuẩn hóa JSON | 5 test phát hiện lỗi; test ranh giới 72 giờ vốn đúng vẫn đạt |
| Source + draft + Learning Passport sau sửa | 21/21 đạt |
| `npm test` | Production build và authoring audit đạt; 160/160 test đạt; exit 0 |
| `npm run lint` | Exit 0 |
| `git diff --check` | Đạt |
| Reviewer độc lập | Không phát hiện lỗi quan trọng trong phạm vi; chạy lại source/draft 17/17 đạt |

Sáu regression mới bao phủ metadata/ID, ngày mâu thuẫn, mutation không đổi input khi từ chối, đúng mốc 72 giờ (và sớm hơn 1ms), replay giữ bằng chứng, bảo toàn bytes lưu trữ và chặn backup hỏng. Trong vòng viết test ban đầu có so sánh object chứa sourceUrl undefined với JSON đã bỏ trường đó; fixture được bổ sung URL hợp lệ, sau đó test đã được chạy lại trên source gốc để xác nhận năm failure thực sự do lỗi production.

Nguyên nhân ngày hỏng đã được đối chiếu với MDN: Date.parse có thể trả NaN; do đó chỉ so sánh lớn hơn hiện tại là chưa đủ. Reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse .

## Giới hạn

Không chạy thêm E2E trình duyệt trong checkpoint này; thay đổi chủ yếu ở logic validation và lưu tiến độ, đã kiểm thử bằng dữ liệu thực của schema. Không bổ sung pipeline AI, OCR hay URL fetching. Lưu trữ vẫn là v1, không migration và không xóa dữ liệu.

Các Task 2–4 (ingestion/coverage/resumable draft) vẫn chưa triển khai.
