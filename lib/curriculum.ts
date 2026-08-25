export type LessonStatus = "mastered" | "active" | "available" | "locked";

export type CurriculumLesson = {
  id: string;
  title: string;
  outcome: string;
  transfer: string;
  status: LessonStatus;
  statusLabel: string;
};

export const curriculum: CurriculumLesson[] = [
  { id: "problem-frame", title: "Đóng khung vấn đề", outcome: "Tách input, output và constraints.", transfer: "Biến yêu cầu kinh doanh thành bài toán có thể kiểm chứng.", status: "mastered", statusLabel: "Đã vững" },
  { id: "data-feature-label", title: "Data, feature, label", outcome: "Nhận diện vai trò của từng trường dữ liệu.", transfer: "Phát hiện feature không tồn tại tại thời điểm inference.", status: "mastered", statusLabel: "Đã vững" },
  { id: "data-quality", title: "Data quality", outcome: "Nhìn thấy lỗi âm thầm trước khi train.", transfer: "Thiết kế ba validation gate cho dữ liệu đầu vào.", status: "mastered", statusLabel: "Đã vững" },
  { id: "functions", title: "Hàm như phép biến đổi", outcome: "Đọc input-output bằng đồ thị và công thức.", transfer: "Giải thích feature transformation trong pipeline.", status: "active", statusLabel: "Đang học" },
  { id: "vectors", title: "Vector và dot product", outcome: "Hiểu cách feature kết hợp với trọng số.", transfer: "Tính và diễn giải một prediction từ feature vector.", status: "active", statusLabel: "Tiếp theo" },
  { id: "linear-model", title: "Mô hình tuyến tính", outcome: "Tạo prediction từ weights và bias.", transfer: "Nêu giới hạn của linear decision boundary.", status: "available", statusLabel: "Có thể mở" },
  { id: "residual", title: "Residual", outcome: "Đo sai khác ở từng quan sát.", transfer: "Phân biệt residual âm và dương trong dữ liệu thật.", status: "locked", statusLabel: "Bị khóa" },
  { id: "mse", title: "Mean Squared Error", outcome: "Gộp lỗi thành một mục tiêu tối ưu.", transfer: "Chọn loss phù hợp trước outlier.", status: "locked", statusLabel: "Bị khóa" },
  { id: "derivative", title: "Đạo hàm là độ nhạy", outcome: "Biết đầu ra đổi nhanh thế nào.", transfer: "Đọc dấu và độ lớn của đạo hàm trong training.", status: "locked", statusLabel: "Bị khóa" },
  { id: "gradient", title: "Gradient", outcome: "Nhận diện hướng tăng nhanh nhất của loss.", transfer: "Giải thích vì sao đi ngược gradient.", status: "locked", statusLabel: "Bị khóa" },
  { id: "learning-rate", title: "Learning rate", outcome: "Điều khiển kích thước bước cập nhật.", transfer: "Chẩn đoán divergence và hội tụ quá chậm.", status: "locked", statusLabel: "Bị khóa" },
  { id: "from-scratch", title: "Linear regression từ đầu", outcome: "Tự viết training loop bằng Python.", transfer: "Dùng test để bắt lỗi gradient và shape.", status: "locked", statusLabel: "Bị khóa" },
  { id: "validation", title: "Validation và overfitting", outcome: "Đo khả năng tổng quát hóa.", transfer: "Thiết kế split tránh temporal leakage.", status: "locked", statusLabel: "Bị khóa" },
  { id: "capstone", title: "Raw CSV đến mô hình", outcome: "Nối dữ liệu, toán, code và đánh giá.", transfer: "Bảo vệ quyết định kỹ thuật bằng bằng chứng.", status: "locked", statusLabel: "Capstone" },
];

export const todayQueue = [
  { title: "Vector và dot product", type: "Bài học mới", description: "Tương tác với feature vector trước khi viết công thức.", minutes: 12 },
  { title: "Data quality", type: "Ôn sau 3 ngày", description: "Tìm lỗi schema trong một batch dữ liệu khác bối cảnh.", minutes: 8 },
  { title: "Correlation hay causation?", type: "Sửa misconception", description: "Dùng phản ví dụ để phá một suy luận quen thuộc.", minutes: 7 },
  { title: "Giải thích bằng tiếng Anh", type: "Technical English", description: "Tóm tắt feature và label bằng ba câu ngắn.", minutes: 5 },
];
