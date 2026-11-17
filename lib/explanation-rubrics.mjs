export const explanationRubrics = {
  "frame-explain": {
    requiredConcepts: 3,
    concepts: [
      { label: "quyết định", terms: ["quyết định", "hành động sau dự đoán", "việc sẽ làm", "việc doanh nghiệp sẽ làm"] },
      { label: "mục tiêu", terms: ["mục tiêu", "target", "đích kinh doanh"] },
      { label: "thước đo", terms: ["metric", "thước đo", "chỉ số đánh giá"] },
      { label: "ràng buộc", terms: ["ràng buộc", "giới hạn vận hành", "điều kiện thực tế"] },
      { label: "mô hình", terms: ["model", "mô hình", "thuật toán"] },
    ],
  },
  "dfl-explain": {
    requiredConcepts: 4,
    concepts: [
      { label: "feature", terms: ["feature", "đặc trưng", "biến đầu vào", "thuộc tính đầu vào"] },
      { label: "label", terms: ["label", "nhãn", "kết quả cần dự đoán"] },
      { label: "mốc dự đoán", terms: ["thời điểm", "mốc thời gian", "lúc dự đoán", "thời điểm t"] },
      { label: "thông tin sẵn có", terms: ["trước", "đã có", "sẵn có", "biết được lúc đó"] },
      { label: "thông tin tương lai", terms: ["sau", "tương lai", "chưa xảy ra"] },
      { label: "leakage", terms: ["leakage", "rò rỉ dữ liệu", "nhìn thấy tương lai"] },
    ],
  },
  "dq-explain": {
    requiredConcepts: 3,
    concepts: [
      { label: "missing", terms: ["missing", "bị thiếu", "không có giá trị", "trống"] },
      { label: "invalid", terms: ["invalid", "không hợp lệ", "sai miền", "vi phạm quy tắc"] },
      { label: "stale", terms: ["stale", "lỗi thời", "quá cũ", "không còn mới"] },
      { label: "thời gian", terms: ["thời gian", "cập nhật", "độ mới", "freshness"] },
    ],
  },
  "fn-explain": {
    requiredConcepts: 3,
    concepts: [
      { label: "input", terms: ["input", "đầu vào", "dữ liệu nhận vào"] },
      { label: "output", terms: ["output", "đầu ra", "kết quả trả ra"] },
      { label: "phép biến đổi", terms: ["hàm", "phép biến đổi", "quy tắc xử lý"] },
      { label: "hợp đồng kiểu", terms: ["type", "shape", "domain", "kiểu dữ liệu", "kích thước", "hợp đồng"] },
      { label: "bước kế tiếp", terms: ["bước", "khâu tiếp theo", "hàm sau"] },
    ],
  },
  "vec-explain": {
    requiredConcepts: 3,
    concepts: [
      { label: "feature", terms: ["feature", "đặc trưng", "giá trị đầu vào"] },
      { label: "trọng số", terms: ["trọng số", "weight", "mức quan trọng"] },
      { label: "đóng góp", terms: ["đóng góp", "contribution", "phần điểm"] },
      { label: "phép cộng", terms: ["cộng", "tổng", "gộp lại"] },
      { label: "prediction", terms: ["prediction", "dự đoán", "kết quả cuối"] },
    ],
  },
  "lm-explain": {
    requiredConcepts: 4,
    concepts: [
      { label: "weight", terms: ["weight", "trọng số", "hệ số"] },
      { label: "bias", terms: ["bias", "hệ số chặn", "độ lệch"] },
      { label: "ảnh hưởng của feature", terms: ["feature", "đặc trưng", "độ nhạy", "độ dốc"] },
      { label: "baseline", terms: ["baseline", "mốc nền", "giá trị nền", "đầu ra khi đầu vào bằng 0"] },
      { label: "prediction", terms: ["prediction", "dự đoán", "đầu ra"] },
    ],
  },
  "res-explain": {
    requiredConcepts: 4,
    concepts: [
      { label: "residual", terms: ["residual", "phần dư", "sai số có dấu"] },
      { label: "hai dấu", terms: ["dương", "âm", "trái dấu", "cao hơn và thấp hơn", "dự đoán thấp", "dự đoán cao"] },
      { label: "triệt tiêu", terms: ["triệt tiêu", "bù nhau", "cộng thành 0"] },
      { label: "trung bình", terms: ["trung bình", "average", "giá trị bình quân", "bình quân"] },
      { label: "độ lớn lỗi", terms: ["độ lớn", "magnitude", "sai nhiều", "lỗi lớn"] },
    ],
  },
  "mse-explain": {
    requiredConcepts: 4,
    concepts: [
      { label: "MSE", terms: ["mse", "mean squared error", "sai số bình phương"] },
      { label: "MAE", terms: ["mae", "mean absolute error", "sai số tuyệt đối"] },
      { label: "bình phương", terms: ["bình phương", "e²", "lũy thừa hai"] },
      { label: "outlier", terms: ["outlier", "điểm ngoại lệ", "lỗi rất lớn"] },
      { label: "khuếch đại ảnh hưởng", terms: ["ảnh hưởng", "khuếch đại", "chi phối", "tăng nhanh"] },
    ],
  },
  "der-explain": {
    requiredConcepts: 4,
    concepts: [
      { label: "đạo hàm", terms: ["đạo hàm", "derivative", "slope"] },
      { label: "độ nhạy", terms: ["độ nhạy", "tốc độ đổi", "mức phản ứng"] },
      { label: "cục bộ", terms: ["cục bộ", "quanh một điểm", "lân cận"] },
      { label: "thay đổi", terms: ["thay đổi", "dịch một lượng nhỏ", "dịch đầu vào một lượng nhỏ", "tăng nhẹ"] },
      { label: "toàn bộ hàm", terms: ["toàn bộ", "mọi vị trí", "hình dạng chung", "điểm khác"] },
    ],
  },
  "grad-explain": {
    requiredConcepts: 4,
    concepts: [
      { label: "gradient", terms: ["gradient", "vectơ đạo hàm", "vector độ nhạy"] },
      { label: "đạo hàm riêng", terms: ["đạo hàm", "đạo hàm riêng", "partial derivative"] },
      { label: "vector", terms: ["vector", "nhiều thành phần", "danh sách"] },
      { label: "parameter", terms: ["parameter", "tham số", "weight"] },
      { label: "hướng đổi loss", terms: ["hướng", "loss", "chiều tăng", "chiều giảm"] },
    ],
  },
  "lr-explain": {
    requiredConcepts: 4,
    concepts: [
      { label: "learning rate", terms: ["learning rate", "tốc độ học", "kích thước bước"] },
      { label: "bước cập nhật", terms: ["bước", "cập nhật", "dịch chuyển"] },
      { label: "quá nhỏ", terms: ["nhỏ", "chậm", "nhiều vòng"] },
      { label: "quá lớn", terms: ["lớn", "nhảy qua", "dao động", "vượt đáy"] },
      { label: "hội tụ", terms: ["hội tụ", "loss", "đến đáy", "ổn định"] },
    ],
  },
  "scratch-explain": {
    requiredConcepts: 5,
    concepts: [
      { label: "prediction", terms: ["prediction", "dự đoán", "đầu ra"] },
      { label: "loss", terms: ["loss", "sai số", "mức lệch"] },
      { label: "gradient", terms: ["gradient", "hướng sửa", "độ nhạy"] },
      { label: "update parameter", terms: ["update", "cập nhật", "sửa parameter", "đổi tham số", "đổi weight"] },
      { label: "feedback loop", terms: ["feedback", "phản hồi", "vòng lặp", "lặp lại"] },
    ],
  },
  "val-explain": {
    requiredConcepts: 5,
    concepts: [
      { label: "overfitting", terms: ["overfitting", "quá khớp", "học thuộc train"] },
      { label: "underfitting", terms: ["underfitting", "chưa học đủ", "mô hình quá đơn giản"] },
      { label: "train", terms: ["train", "tập huấn luyện", "dữ liệu học"] },
      { label: "validation", terms: ["validation", "tập kiểm định", "dữ liệu chưa dùng để fit"] },
      { label: "khả năng tổng quát", terms: ["tổng quát", "generalize", "dữ liệu mới", "chênh lệch"] },
    ],
  },
  "cap-explain": {
    requiredConcepts: 5,
    concepts: [
      { label: "mục tiêu và quyết định", terms: ["mục tiêu", "quyết định", "giá trị kinh doanh"] },
      { label: "data", terms: ["data", "dữ liệu", "đầu vào production"] },
      { label: "đánh giá", terms: ["metric", "validation", "thước đo", "kiểm định"] },
      { label: "vận hành", terms: ["production", "vận hành", "reliability", "độ ổn định", "latency"] },
      { label: "giới hạn", terms: ["giới hạn", "ràng buộc", "failure mode", "trường hợp thất bại"] },
      { label: "model", terms: ["model", "mô hình", "score"] },
    ],
  },
};

export function getExplanationRubric(activityId) {
  return explanationRubrics[activityId] ?? null;
}
