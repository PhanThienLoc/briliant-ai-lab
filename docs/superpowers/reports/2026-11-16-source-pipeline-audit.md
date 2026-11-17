# Kiểm thử nền nguồn → khóa học

Ngày: 2026-11-16. Source kiểm tra: `3d02338905c9be883ee6882fe03e99b30c39bec0` (v37). Chỉ bổ sung tài liệu trong checkpoint này; chưa sửa runtime hoặc triển khai tính năng AI.

## Kết quả chạy mới

| Kiểm tra | Kết quả |
| --- | --- |
| `npm test` (gồm production build và content audit) | Exit 0; 154/154 pass, 0 fail/skip/cancel |
| `npm run lint` | Exit 0 |
| Source course/draft/sections/PDF-range/Library subset | 20/20 pass |
| Boundary probe: invalid reviewDueAt | Parser nhận; completeSourceLesson chấp nhận review — lỗi xác nhận |
| Boundary probe: thiếu objective/sourceLocation | Parser nhận — lỗi xác nhận |

Không diễn giải 154/154 thành “không còn lỗi”: hai boundary probe mới chưa thuộc bộ regression cũ.

## Lỗi mới

### P1 — Ngày review hỏng có thể vượt chốt đến hạn

Ở `lib/source-course.ts`, `parseSourceCourses` không kiểm tra ngày. Trong `completeSourceLesson`, `Date.parse('invalid-date')` trả NaN nên phép so sánh với hiện tại không chặn được review. Probe trực tiếp mutation API xác nhận reviewedAt được ghi, kể cả fixture chưa có completedAt.

Ảnh hưởng đã chứng minh: dữ liệu lưu/import không hợp lệ được API tin là hợp lệ. Chưa xác nhận đường giao diện có thể khai thác trực tiếp với trạng thái này; đây không phải kết luận về máy chủ hay xác thực tài khoản.

Cần chặn ngày không hữu hạn, review thiếu completion, dueAt < completedAt +72h và reviewedAt < dueAt. Kiểm tra cả parser lẫn mutation boundary; giữ nguyên dữ liệu gốc khi đọc lỗi.

### P2 — Bản ghi thiếu mục tiêu/vị trí nguồn vẫn được nhận

Xóa objective và sourceLocation của một bài hợp lệ rồi serialize/parse vẫn thành công. Validation thiếu có thể làm mất ngữ cảnh học hoặc dẫn chứng sau import. Cần kiểm tra chuỗi không rỗng và ID trùng; chưa coi các trường hợp bổ sung này đã có test cho tới khi Task 1 được thực hiện.

## Probe tái hiện

Chạy từ root repository bằng `node --input-type=module`; không đọc hoặc sửa dữ liệu người dùng:

```js
import { buildSourceCourse, parseSourceCourses, completeSourceLesson } from './lib/source-course.ts';
const text = Array.from({length: 3}, (_, i) =>
  `Chủ đề số ${i+1} mô tả một cơ chế riêng biệt trong quá trình xử lý dữ liệu và kiểm tra kết quả. Ví dụ số ${i+1} giải thích vì sao cần kiểm chứng bằng một đầu vào mới trước khi chấp nhận kết luận.`
).join('\n\n');
const course = buildSourceCourse({ title: 'Probe', kind: 'book', sourceName: 'fixture', text });
const badDate = structuredClone(course);
badDate.lessons[0].reviewDueAt = 'invalid-date';
parseSourceCourses(JSON.stringify([badDate])); // Hiện không throw; phải reject sau sửa.
completeSourceLesson(badDate, badDate.lessons[0].id, new Date('2026-11-16T00:00:00Z'), true);
// Hiện thành công; phải reject sau sửa.
const missing = structuredClone(course);
delete missing.lessons[0].objective;
delete missing.lessons[0].sourceLocation;
parseSourceCourses(JSON.stringify([missing])); // Hiện không throw; phải reject sau sửa.
```

## Kiểm tra đầu vào thực

Dùng PyMuPDF để kiểm tra số trang và độ dài lớp chữ của 10 trang đầu mỗi PDF, không qua file picker:

- `m610_learning_algorithms.vi.pdf`: 277 trang; 10/10 trang đầu có chữ trích xuất được (82–7.973 ký tự/trang).
- `Practical Statistics for Data Scientists.pdf`: 562 trang; 10/10 trang đầu có chữ trích xuất được (19–1.295 ký tự/trang).

Đây là kiểm tra khả năng lấy chữ, không phải xác nhận bố cục/công thức đã được đọc đúng hoặc toàn bộ sách đã thành khóa học. Các trang đầu có thể là bìa/mục lục; pipeline cần phân biệt chúng với chương học. Chưa chạy đường PDF.js/browser file input với hai tệp này trong lượt hiện tại.

## Phạm vi và giới hạn

- Xác nhận từ mã hiện tại: tối đa 6 bài lấy mẫu, không phải khóa học bao phủ cả sách; URL chỉ dẫn nguồn; video cần transcript; scan cần OCR.
- Các câu hỏi hiện tại kiểm tra nhận diện câu trong đoạn; mục tiêu do người dùng sửa chưa được chấm theo khái niệm.
- Không chạy E2E browser mới trong lượt này. Kết quả mobile/focus từ v37 là kiểm chứng trước đó, không tính thành kiểm thử mới.
- Chưa gọi model, chưa phát sinh chi phí sinh khóa học và chưa đo chất lượng bài học do AI tạo.

## Kế hoạch và cổng tiếp theo

1. Sửa hai lỗi validation và bổ sung test đỏ → xanh.
2. Tách ingestion, báo rõ trang rỗng/cắt ngắn, giữ locator gốc.
3. Tạo coverage draft cho toàn bộ phần được chọn; không dùng 6 đoạn mẫu làm đại diện cho cả sách.
4. Cho đọc lại/lưu/resume draft, xác minh không ảnh hưởng tiến độ cũ.
5. Sau đó chốt provider/budget/đồng ý gửi trích đoạn và thiết kế pilot AI một chương riêng.

Spec: `docs/superpowers/specs/2026-11-16-source-pipeline-design.md`.
Plan có task, file, interface và điều kiện kiểm thử: `docs/superpowers/plans/2026-11-16-source-foundation.md`.
