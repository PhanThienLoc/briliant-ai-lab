export type CodeSnippet = { label: string; code: string; why: string };
export type CodeCoachDefinition = { mentalSteps: string[]; snippets: CodeSnippet[] };

const shared = (mentalSteps: string[], snippets: CodeSnippet[]): CodeCoachDefinition => ({ mentalSteps, snippets });

export const codeCoachCatalog: Record<string, CodeCoachDefinition> = {
  "problem-frame": shared(
    ["Duyệt từng tên trường bắt buộc.", "Chỉ trả về True khi trường tồn tại và giá trị không rỗng."],
    [{ label: "all + generator", code: "all(key in brief and brief[key] for key in required)", why: "all chỉ True khi mọi kiểm tra bên trong đều True." }],
  ),
  "data-feature-label": shared(
    ["Đi qua từng tên cột.", "Giữ cột nếu nó khác label."],
    [{ label: "List comprehension", code: "[column for column in columns if column != label]", why: "Tạo danh sách mới chỉ từ các cột thỏa điều kiện." }],
  ),
  "data-quality": shared(
    ["Chặn None trước để tránh so sánh None với số.", "Sau đó kiểm tra đồng thời hai biên."],
    [{ label: "Kiểm tra miền", code: "age is not None and 0 <= age <= 120", why: "and dừng sớm nếu age là None; chained comparison giữ cả hai biên." }],
  ),
  functions: shared(
    ["Gọi normalize(x) trước.", "Đưa output vừa nhận vào model rồi return."],
    [{ label: "Hợp thành hàm", code: "model(normalize(x))", why: "Python chạy lời gọi trong cùng trước, nên normalize chạy trước model." }],
  ),
  vectors: shared(
    ["zip ghép phần tử cùng vị trí.", "Nhân từng cặp và sum tất cả contribution."],
    [
      { label: "Ghép cặp", code: "zip(x, w)", why: "Tạo lần lượt các cặp (feature, weight)." },
      { label: "Weighted sum", code: "sum(value * weight for value, weight in zip(x, w))", why: "Nhân từng cặp rồi cộng toàn bộ." },
    ],
  ),
  "linear-model": shared(
    ["Tính dot product giống bài trước.", "Cộng bias vào tổng rồi return."],
    [{ label: "Linear prediction", code: "sum(value * weight for value, weight in zip(x, w)) + b", why: "Weighted sum tạo phần phụ thuộc feature; b dịch baseline." }],
  ),
  residual: shared(
    ["Ghép actual với prediction cùng hàng.", "Tạo một residual actual - predicted cho mỗi cặp."],
    [{ label: "Residual list", code: "[actual - predicted for actual, predicted in zip(y, y_hat)]", why: "Giữ dấu và độ lớn lỗi của từng quan sát." }],
  ),
  mse: shared(
    ["Bình phương từng residual.", "Cộng chúng và chia cho số quan sát."],
    [{ label: "Mean squared error", code: "sum((actual - predicted) ** 2 for actual, predicted in zip(y, y_hat)) / len(y)", why: "Đúng thứ tự residual → square → average." }],
  ),
  derivative: shared(
    ["Đo output thay đổi bao nhiêu khi x tăng eps.", "Chia thay đổi output cho eps."],
    [{ label: "Finite difference", code: "(f(x + eps) - f(x)) / eps", why: "Xấp xỉ slope cục bộ bằng một bước rất nhỏ." }],
  ),
  gradient: shared(
    ["Ghép từng weight với gradient tương ứng.", "Trừ learning-rate nhân gradient cho từng phần tử."],
    [{ label: "Vector update", code: "[weight - lr * gradient for weight, gradient in zip(weights, gradients)]", why: "Mỗi parameter đi ngược chiều gradient của chính nó." }],
  ),
  "learning-rate": shared(
    ["Tính độ lớn bước đi: learning_rate × gradient.", "Trừ bước đó khỏi weight hiện tại."],
    [{ label: "Gradient step", code: "weight - learning_rate * gradient", why: "Dấu trừ đưa parameter đi ngược chiều tăng của loss." }],
  ),
  "from-scratch": shared(
    ["Prediction → error → loss.", "Từ error tính hai gradient, rồi cập nhật weight và bias."],
    [
      { label: "Forward pass", code: "y_hat = weight * x + bias\nerror = y_hat - y\nloss = error ** 2", why: "Tạo prediction và đo sai số trước update." },
      { label: "Gradients", code: "weight_gradient = 2 * error * x\nbias_gradient = 2 * error", why: "Đạo hàm squared error theo weight và bias." },
      { label: "Return update", code: "return weight - learning_rate * weight_gradient, bias - learning_rate * bias_gradient, loss", why: "Cập nhật hai parameter nhưng trả về loss trước update." },
    ],
  ),
  validation: shared(
    ["Fit đúng một lần trên train.", "Score đúng một lần trên validation và return metric."],
    [
      { label: "Fit train", code: "fit(X_train, y_train)", why: "Validation không được tham gia học parameter." },
      { label: "Score validation", code: "return score(X_val, y_val)", why: "Đánh giá trên dữ liệu model chưa fit." },
    ],
  ),
  capstone: shared(
    ["Split trước; fit preprocessor chỉ trên train.", "Transform cả hai tập; fit model trên train mới; score validation mới."],
    [
      { label: "Split + fit preprocess", code: "train, val = split(data)\nfit_preprocessor(train)", why: "Khóa ranh giới chống leakage trước preprocessing." },
      { label: "Transform", code: "train_x = transform(train)\nval_x = transform(val)", why: "Dùng cùng phép biến đổi cho cả hai tập." },
      { label: "Fit + score", code: "fit_model(train_x)\nreturn score(val_x)", why: "Model chỉ học train; validation chỉ dùng để đánh giá." },
    ],
  ),
};

export function getCodeCoach(lessonId: string): CodeCoachDefinition {
  return codeCoachCatalog[lessonId] ?? shared(["Tách bài toán thành input, phép biến đổi và output."], []);
}
