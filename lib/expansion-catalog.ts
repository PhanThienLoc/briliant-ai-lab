export type ExpansionTrackId = "r1-math" | "r2-sql-algorithms" | "r3-machine-learning" | "r4-deep-learning-llm";

export type ExpansionLabId =
  | "logic-truth-table"
  | "probability-conditional"
  | "probability-bayes"
  | "linear-vectors"
  | "linear-transform"
  | "sql-select"
  | "sql-join-aggregate"
  | "sql-advanced-relations"
  | "complexity-growth"
  | "queue-behavior"
  | "graph-bfs"
  | "ml-threshold"
  | "ml-split"
  | "ml-leakage"
  | "ml-knn-scaling"
  | "ml-regularization"
  | "dl-dense-relu"
  | "dl-backprop"
  | "llm-token-embedding"
  | "llm-attention"
  | "ai-evaluation";

export type ExpansionReview = {
  prompt: string;
  options: string[];
  answerIndex: number;
  explanation: string;
};

export type ExpansionEdgeId =
  | "logic-to-conditional"
  | "conditional-to-bayes"
  | "vectors-to-transform"
  | "select-to-join"
  | "join-to-advanced"
  | "queue-to-bfs"
  | "split-to-leakage"
  | "split-to-regularization"
  | "dense-to-backprop"
  | "token-to-attention"
  | "backprop-to-evaluation"
  | "attention-to-evaluation";

export type ExpansionPrerequisiteEdge = {
  id: ExpansionEdgeId;
  from: ExpansionLabId;
  to: ExpansionLabId;
  prompt: string;
  options: string[];
  answerIndex: number;
  explanation: string;
};

export type ExpansionLab = {
  id: ExpansionLabId;
  trackId: ExpansionTrackId;
  index: string;
  title: string;
  outcome: string;
  mechanism: string;
  prerequisites: ExpansionLabId[];
  review: ExpansionReview;
  source: { title: string; locator: string };
};

export const expansionTracks = [
  {
    id: "r1-math" as const,
    release: "R1",
    title: "Nền tảng toán cho AI",
    description: "Hai nhánh prerequisite: suy luận xác suất và hình học tuyến tính. Mỗi lab chỉ mở khi mắt xích nền đã có evidence.",
  },
  {
    id: "r2-sql-algorithms" as const,
    release: "R2",
    title: "SQL & tư duy thuật toán",
    description: "Từ truy vấn một bảng đến JOIN/aggregate; từ hành vi FIFO đến BFS. Grader đọc kết quả và trạng thái, không đọc từ khóa.",
  },
  {
    id: "r3-machine-learning" as const,
    release: "R3",
    title: "Machine Learning trực quan",
    description: "Thay tham số và quan sát hệ quả ngay: threshold, data split, leakage, feature scaling và regularization.",
  },
  {
    id: "r4-deep-learning-llm" as const,
    release: "R4",
    title: "Deep Learning, LLM & AI Engineering",
    description: "Hai nhánh hội tụ: forward/backprop giải thích cách mạng học; token/embedding/attention giải thích cách LLM xử lý ngữ cảnh; evaluation nối chúng thành quyết định hệ thống.",
  },
];

export const expansionLabs: ExpansionLab[] = [
  {
    id: "logic-truth-table", trackId: "r1-math", index: "R1.01", title: "Logic mệnh đề",
    outcome: "Tìm phản ví dụ thay vì tin một suy luận nghe có vẻ hợp lý.",
    mechanism: "Giá trị P, Q → toán tử logic → truth table → phản ví dụ.", prerequisites: [],
    review: { prompt: "Một hệ thống dùng luật: nếu risk cao thì chặn. Trường hợp nào duy nhất bác bỏ luật?", options: ["Risk cao và bị chặn", "Risk cao nhưng không bị chặn", "Risk thấp nhưng bị chặn"], answerIndex: 1, explanation: "Mệnh đề P → Q chỉ sai khi P đúng nhưng Q sai." },
    source: { title: "Artificial Intelligence: A Modern Approach", locator: "Chapter 7.4: Propositional Logic" },
  },
  {
    id: "probability-conditional", trackId: "r1-math", index: "R1.02", title: "Xác suất có điều kiện",
    outcome: "Đổi đúng không gian mẫu khi đã biết một điều kiện xảy ra.",
    mechanism: "Biết B xảy ra → thu hẹp mẫu xuống B → đếm A ∩ B → P(A|B).", prerequisites: ["logic-truth-table"],
    review: { prompt: "Trong 20 phiên mua hàng có 15 phiên mobile. P(mobile | mua hàng) là bao nhiêu?", options: ["15%", "30%", "75%"], answerIndex: 2, explanation: "Khi đã biết mua hàng, mẫu số là 20; 15/20 = 75%." },
    source: { title: "Practical Statistics for Data Scientists", locator: "Chapter 2: Data and Sampling Distributions — probability and sampling" },
  },
  {
    id: "probability-bayes", trackId: "r1-math", index: "R1.03", title: "Bayes và base rate",
    outcome: "Cập nhật xác suất sau bằng chứng mà không bỏ quên prior.",
    mechanism: "Prior × likelihood → evidence mass → posterior.", prerequisites: ["probability-conditional"],
    review: { prompt: "Hai model có cùng sensitivity và false-positive rate. Model nào cho precision cao hơn?", options: ["Model chạy trên nhóm có base rate cao hơn", "Model chạy trên nhóm có base rate thấp hơn", "Luôn bằng nhau"], answerIndex: 0, explanation: "Base rate cao làm true-positive mass lớn hơn tương đối so với false-positive mass." },
    source: { title: "Artificial Intelligence: A Modern Approach", locator: "Chapter 13.5: Bayes' Rule and Its Use" },
  },
  {
    id: "linear-vectors", trackId: "r1-math", index: "R1.04", title: "Vector và độ lớn",
    outcome: "Nối từng thành phần với hướng và độ lớn của một điểm dữ liệu.",
    mechanism: "Thành phần x, y → vector hình học → bình phương từng trục → độ lớn.", prerequisites: [],
    review: { prompt: "Vector [6, 8] có độ lớn bao nhiêu?", options: ["7", "10", "14"], answerIndex: 1, explanation: "Độ lớn là √(6² + 8²) = 10." },
    source: { title: "Deep Learning with Python, Third Edition", locator: "Chapter 2.2–2.3: Tensors and tensor operations" },
  },
  {
    id: "linear-transform", trackId: "r1-math", index: "R1.05", title: "Phép biến đổi tuyến tính",
    outcome: "Nhìn matrix như một cỗ máy biến đổi không gian, không chỉ là bảng số.",
    mechanism: "Vector đầu vào → scale từng trục → rotation → vector đầu ra.", prerequisites: ["linear-vectors"],
    review: { prompt: "Scale [2, 1] theo X ×2 rồi quay 90° ngược chiều kim đồng hồ cho kết quả nào?", options: ["[-1, 4]", "[4, -1]", "[1, 4]"], answerIndex: 0, explanation: "Scale tạo [4,1], phép quay 90° ánh xạ [x,y] thành [-y,x]." },
    source: { title: "Deep Learning with Python, Third Edition", locator: "Chapter 2.3: Tensor operations" },
  },
  {
    id: "sql-select", trackId: "r2-sql-algorithms", index: "R2.01", title: "SQL SELECT pipeline",
    outcome: "Viết truy vấn từ mục tiêu kết quả và đọc được thứ tự xử lý.",
    mechanism: "FROM → WHERE → SELECT → ORDER BY → LIMIT.", prerequisites: [],
    review: { prompt: "Muốn lọc rows trước khi sắp xếp, hai clause nào thể hiện đúng pipeline?", options: ["ORDER BY rồi WHERE", "WHERE rồi ORDER BY", "SELECT rồi FROM"], answerIndex: 1, explanation: "Trong mô hình thực thi của lab, WHERE thu hẹp rows trước ORDER BY." },
    source: { title: "Data Engineering with Python", locator: "Chapter 4: Working with Databases" },
  },
  {
    id: "sql-join-aggregate", trackId: "r2-sql-algorithms", index: "R2.02", title: "JOIN, GROUP BY và aggregate",
    outcome: "Nối fact với dimension rồi giảm nhiều rows thành số liệu theo nhóm.",
    mechanism: "JOIN khóa quan hệ → WHERE lọc fact → GROUP BY tạo bucket → aggregate tóm tắt.", prerequisites: ["sql-select"],
    review: { prompt: "Vì sao aggregate thường đi sau JOIN trong bài doanh thu theo customer tier?", options: ["JOIN gắn tier vào từng order trước khi gom nhóm", "JOIN luôn làm giảm số rows", "GROUP BY tự tìm tier ở bảng khác"], answerIndex: 0, explanation: "Fact orders chưa có tier; JOIN phải làm giàu từng row trước khi GROUP BY." },
    source: { title: "Data Engineering with Python", locator: "Chapter 1: relational keys join tables; Chapter 4: SQL databases" },
  },
  {
    id: "sql-advanced-relations", trackId: "r2-sql-algorithms", index: "R2.03", title: "HAVING, subquery và outer join",
    outcome: "Chọn đúng relational operator cho lọc nhóm, ngưỡng động và dữ liệu không khớp khóa.",
    mechanism: "GROUP BY → HAVING; scalar subquery → ngưỡng; OUTER JOIN → giữ rows không khớp.", prerequisites: ["sql-join-aggregate"],
    review: { prompt: "Muốn giữ cả customer chưa có order, loại JOIN nào phải xuất phát từ customers?", options: ["INNER JOIN", "LEFT OUTER JOIN", "CROSS JOIN"], answerIndex: 1, explanation: "LEFT OUTER JOIN giữ mọi row phía trái và điền NULL cho phía phải khi không khớp." },
    source: { title: "Data Engineering with Python", locator: "Chapter 4: Working with Databases — joins and relational queries" },
  },
  {
    id: "complexity-growth", trackId: "r2-sql-algorithms", index: "R2.04", title: "Big-O bằng số phép toán",
    outcome: "Phân biệt thuật toán nhanh ở dữ liệu nhỏ với thuật toán scale tốt.",
    mechanism: "Input size n → operation count → growth class → engineering trade-off.", prerequisites: [],
    review: { prompt: "Khi n tăng gấp đôi, O(n²) tăng xấp xỉ bao nhiêu lần?", options: ["2 lần", "4 lần", "Không đổi"], answerIndex: 1, explanation: "(2n)² = 4n²." },
    source: { title: "Problem Solving with Algorithms and Data Structures", locator: "Chapter 2: Algorithm Analysis" },
  },
  {
    id: "queue-behavior", trackId: "r2-sql-algorithms", index: "R2.05", title: "Queue: FIFO bằng trạng thái",
    outcome: "Phân biệt queue với stack bằng chuỗi trạng thái, không bằng định nghĩa thuộc lòng.",
    mechanism: "Enqueue vào rear → giữ thứ tự chờ → dequeue ở front → FIFO output.", prerequisites: [],
    review: { prompt: "Enqueue A, B, C rồi dequeue hai lần sẽ trả về gì?", options: ["C rồi B", "A rồi B", "A rồi C"], answerIndex: 1, explanation: "Queue trả phần tử vào sớm nhất trước: first-in, first-out." },
    source: { title: "Problem Solving with Algorithms and Data Structures", locator: "Chapter 3.5: Queues and the FIFO ordering property" },
  },
  {
    id: "graph-bfs", trackId: "r2-sql-algorithms", index: "R2.06", title: "BFS và hàng đợi",
    outcome: "Dự đoán từng dequeue và giải thích vì sao BFS đi theo từng lớp.",
    mechanism: "Dự đoán front → dequeue node → enqueue unseen neighbors → kiểm tra queue invariant.", prerequisites: ["queue-behavior"],
    review: { prompt: "Tính chất nào của queue khiến BFS duyệt node gần trước node xa?", options: ["LIFO", "FIFO", "Sắp xếp alphabet"], answerIndex: 1, explanation: "FIFO giữ các node được phát hiện ở lớp hiện tại đi trước lớp sau." },
    source: { title: "Problem Solving with Algorithms and Data Structures", locator: "Chapter 3.5 queue behavior applied to breadth-first traversal" },
  },
  {
    id: "ml-threshold", trackId: "r3-machine-learning", index: "R3.01", title: "Confusion matrix và threshold",
    outcome: "Nhìn threshold như một quyết định trade-off giữa false positive và false negative.",
    mechanism: "Prediction score → threshold → predicted class → TP/FP/FN/TN → precision/recall.", prerequisites: [],
    review: { prompt: "Hạ threshold thường làm recall và số false positive thay đổi thế nào?", options: ["Recall tăng, false positive có thể tăng", "Cả hai luôn giảm", "Không có gì đổi"], answerIndex: 0, explanation: "Ngưỡng thấp nhận nhiều mẫu dương hơn, nên thu được thêm true positive nhưng cũng dễ nhận thêm false positive." },
    source: { title: "Deep Learning with Python, Third Edition", locator: "Chapter 4: classification metrics, precision and recall" },
  },
  {
    id: "ml-split", trackId: "r3-machine-learning", index: "R3.02", title: "Train / validation / test simulator",
    outcome: "Tách đúng vai trò học tham số, chọn mô hình và đánh giá cuối cùng.",
    mechanism: "Dataset → train fit → validation tune → test estimate → generalization evidence.", prerequisites: [],
    review: { prompt: "Tập nào chỉ nên mở để đánh giá cuối cùng?", options: ["Train", "Validation", "Test"], answerIndex: 2, explanation: "Test cần đứng ngoài cả quá trình fit lẫn chọn hyperparameter để ước lượng generalization trung thực." },
    source: { title: "Deep Learning with Python, Third Edition", locator: "Chapter 5.2.1: training, validation and test sets" },
  },
  {
    id: "ml-leakage", trackId: "r3-machine-learning", index: "R3.03", title: "Data leakage lab",
    outcome: "Nhận ra preprocessing cũng có thể làm test data rò vào quá trình học.",
    mechanism: "Split trước → fit preprocessing trên train → transform validation/test → đánh giá sạch.", prerequisites: ["ml-split"],
    review: { prompt: "Cách chuẩn hóa nào tránh leakage?", options: ["Fit scaler trên toàn bộ dữ liệu", "Fit scaler trên train rồi transform validation/test", "Fit scaler riêng trên test"], answerIndex: 1, explanation: "Mọi tham số học từ dữ liệu, kể cả mean/std, chỉ được fit trên train." },
    source: { title: "AI Engineering", locator: "Data contamination and data leakage in evaluation pipelines" },
  },
  {
    id: "ml-knn-scaling", trackId: "r3-machine-learning", index: "R3.04", title: "KNN và feature scaling",
    outcome: "Thấy trực tiếp feature có đơn vị lớn chi phối khoảng cách và lá phiếu láng giềng.",
    mechanism: "Feature units → distance → nearest neighbors → majority vote → predicted class.", prerequisites: [],
    review: { prompt: "Vì sao KNN nhạy với scale?", options: ["Khoảng cách cộng độ lệch của các feature", "KNN tự bỏ feature lớn", "Scale chỉ đổi màu biểu đồ"], answerIndex: 0, explanation: "Nếu một feature có dải số lớn hơn nhiều, nó có thể thống trị metric khoảng cách." },
    source: { title: "Practical Statistics for Data Scientists", locator: "Chapter 6: K-nearest neighbors and standardization" },
  },
  {
    id: "ml-regularization", trackId: "r3-machine-learning", index: "R3.05", title: "Overfitting và regularization",
    outcome: "Cân bằng capacity và penalty bằng khoảng cách train–validation thay vì đuổi theo train loss.",
    mechanism: "Capacity + regularization → train loss / validation loss → generalization gap.", prerequisites: ["ml-split"],
    review: { prompt: "Dấu hiệu overfitting điển hình là gì?", options: ["Train và validation cùng giảm", "Train loss giảm nhưng validation loss tăng", "Train loss luôn lớn hơn validation"], answerIndex: 1, explanation: "Mô hình tiếp tục khớp train nhưng generalization xấu đi nên validation loss quay đầu tăng." },
    source: { title: "Deep Learning with Python, Third Edition", locator: "Chapter 5.1 underfitting/overfitting and 5.4.4 regularization" },
  },
  {
    id: "dl-dense-relu", trackId: "r4-deep-learning-llm", index: "R4.01", title: "Dense layer và ReLU",
    outcome: "Tách weighted sum khỏi activation và dự đoán khi neuron bị ReLU chặn về 0.",
    mechanism: "Input × weight → cộng bias → pre-activation z → ReLU → activation.", prerequisites: [],
    review: { prompt: "Neuron có z = −2 trước activation. ReLU trả về gì?", options: ["−2", "0", "2"], answerIndex: 1, explanation: "ReLU giữ phần dương và chặn mọi giá trị âm về 0." },
    source: { title: "Deep Learning with Python, Third Edition", locator: "Chapter 2.3: tensor operations; Chapter 3.6.2: layers" },
  },
  {
    id: "dl-backprop", trackId: "r4-deep-learning-llm", index: "R4.02", title: "Backprop và chain rule",
    outcome: "Theo gradient từ loss về weight và kiểm tra một update có thật sự làm loss giảm.",
    mechanism: "Prediction → error → loss → chain-rule gradient → weight update → loss mới.", prerequisites: ["dl-dense-relu"],
    review: { prompt: "Nếu gradient của weight là âm và learning rate dương, gradient descent đổi weight thế nào?", options: ["Tăng weight", "Giảm weight", "Giữ nguyên"], answerIndex: 0, explanation: "Update w ← w − η∇w; trừ một gradient âm làm weight tăng." },
    source: { title: "Deep Learning with Python, Third Edition", locator: "Chapter 2.4.4: Chaining derivatives — backpropagation" },
  },
  {
    id: "llm-token-embedding", trackId: "r4-deep-learning-llm", index: "R4.03", title: "Tokenization và embedding",
    outcome: "Nhìn chuỗi văn bản biến thành token ID và vector thay vì coi model đọc trực tiếp từ ngữ.",
    mechanism: "Text → token/subword → token ID → embedding lookup → vector sequence.", prerequisites: [],
    review: { prompt: "Lợi ích chính của subword tokenization với từ hiếm là gì?", options: ["Có thể ghép từ các mảnh đã biết", "Luôn tạo đúng một token", "Loại bỏ embedding"], answerIndex: 0, explanation: "Subword chia từ hiếm thành các mảnh có trong vocabulary, giảm phụ thuộc vào token unknown." },
    source: { title: "Build a Large Language Model (From Scratch)", locator: "Chapter 2: Working with Text Data — tokenization and token embeddings" },
  },
  {
    id: "llm-attention", trackId: "r4-deep-learning-llm", index: "R4.04", title: "Self-attention bằng trọng số",
    outcome: "Theo query–key score tới softmax và context vector để thấy token nào được ưu tiên.",
    mechanism: "Query · key → scaled score → softmax weight → weighted values → context vector.", prerequisites: ["llm-token-embedding"],
    review: { prompt: "Softmax trong attention có vai trò gì?", options: ["Biến scores thành trọng số tổng bằng 1", "Xóa positional information", "Chọn ngẫu nhiên một token"], answerIndex: 0, explanation: "Softmax chuẩn hóa scores thành phân phối trọng số dùng để trộn các value vector." },
    source: { title: "Build a Large Language Model (From Scratch)", locator: "Chapter 3: Coding Attention Mechanisms" },
  },
  {
    id: "ai-evaluation", trackId: "r4-deep-learning-llm", index: "R4.05", title: "Evaluation dưới ràng buộc hệ thống",
    outcome: "Chọn cấu hình AI bằng quality, latency và cost đồng thời thay vì chạy theo benchmark đơn lẻ.",
    mechanism: "Use case → tiêu chí/giới hạn → eval set → đo từng candidate → chọn phương án đủ điều kiện.", prerequisites: ["dl-backprop", "llm-attention"],
    review: { prompt: "Model A chất lượng cao nhất nhưng vượt latency budget. Quyết định đúng là gì?", options: ["Vẫn chọn A vì quality cao nhất", "Loại A nếu latency là ràng buộc bắt buộc", "Bỏ đo latency"], answerIndex: 1, explanation: "Evaluation hệ thống dùng nhiều tiêu chí; vi phạm hard constraint khiến candidate không phù hợp dù một metric rất cao." },
    source: { title: "AI Engineering", locator: "Chapters 3–4: evaluation methodology, quality, cost and latency" },
  },
];

export const prerequisiteEdges: ExpansionPrerequisiteEdge[] = [
  {
    id: "logic-to-conditional", from: "logic-truth-table", to: "probability-conditional",
    prompt: "Biết một phiên đã mua hàng (B). Muốn kiểm tra xác suất phiên đó dùng mobile (A), tập nào trở thành không gian mẫu?",
    options: ["Toàn bộ phiên", "Chỉ các phiên trong B", "Chỉ các phiên ngoài B"], answerIndex: 1,
    explanation: "Điều kiện B hoạt động như một bộ lọc logic: mọi tỷ lệ sau đó được tính bên trong B.",
  },
  {
    id: "conditional-to-bayes", from: "probability-conditional", to: "probability-bayes",
    prompt: "Trong các cảnh báo dương tính, mẫu số đúng của P(bệnh | dương tính) gồm gì?",
    options: ["Chỉ true positives", "True positives + false positives", "Toàn bộ người âm tính"], answerIndex: 1,
    explanation: "Bayes vẫn là xác suất có điều kiện: không gian mẫu là toàn bộ bằng chứng dương tính.",
  },
  {
    id: "vectors-to-transform", from: "linear-vectors", to: "linear-transform",
    prompt: "Matrix scale X ×2 tác động lên vector [−3, 4] như thế nào trước khi quay?",
    options: ["[−6, 4]", "[−3, 8]", "[6, 4]"], answerIndex: 0,
    explanation: "Phép scale tác động theo từng thành phần và giữ dấu của trục: x nhân 2, y giữ nguyên.",
  },
  {
    id: "select-to-join", from: "sql-select", to: "sql-join-aggregate",
    prompt: "orders.customer_id và customers.id đóng vai trò gì khi cần lấy tier cho mỗi order?",
    options: ["Khóa nối giữa fact và dimension", "Hai aggregate", "Hai điều kiện ORDER BY"], answerIndex: 0,
    explanation: "JOIN cần một quan hệ khóa; SELECT một bảng chưa thể đọc tier nằm ở bảng khác.",
  },
  {
    id: "join-to-advanced", from: "sql-join-aggregate", to: "sql-advanced-relations",
    prompt: "Đã GROUP BY tier và tính SUM(amount). Muốn loại các tier có revenue dưới 200, clause nào đúng?",
    options: ["WHERE SUM(amount) >= 200", "HAVING SUM(amount) >= 200", "ORDER BY SUM(amount) >= 200"], answerIndex: 1,
    explanation: "WHERE lọc rows trước khi gom nhóm; HAVING lọc kết quả aggregate sau GROUP BY.",
  },
  {
    id: "queue-to-bfs", from: "queue-behavior", to: "graph-bfs",
    prompt: "Queue BFS đang là [B, C]. Sau khi dequeue B và enqueue D, E, trạng thái mới là gì?",
    options: ["[D, E, C]", "[C, D, E]", "[E, D, C]"], answerIndex: 1,
    explanation: "C đã chờ trước nên vẫn đứng ở front; D và E được nối vào rear theo FIFO.",
  },
  {
    id: "split-to-leakage", from: "ml-split", to: "ml-leakage",
    prompt: "Đã tách train/validation/test. Scaler phải học mean và std ở đâu?",
    options: ["Chỉ train", "Train + validation", "Toàn bộ dữ liệu"], answerIndex: 0,
    explanation: "Scaler có trạng thái học được; fit trên validation/test sẽ làm rò thông tin đánh giá.",
  },
  {
    id: "split-to-regularization", from: "ml-split", to: "ml-regularization",
    prompt: "Muốn chọn hệ số regularization mà không làm bẩn test, nên so sánh trên tập nào?",
    options: ["Train", "Validation", "Test sau mỗi lần chỉnh"], answerIndex: 1,
    explanation: "Validation dùng để chọn hyperparameter; test chỉ dùng cho đánh giá cuối cùng.",
  },
  {
    id: "dense-to-backprop", from: "dl-dense-relu", to: "dl-backprop",
    prompt: "Một neuron cho prediction = 2 và target = 6. Backprop cần bắt đầu từ đại lượng nào?",
    options: ["Sai số/loss ở output", "Tên của layer", "Số epoch đã chạy"], answerIndex: 0,
    explanation: "Backprop bắt đầu từ loss, rồi dùng chain rule truyền độ nhạy ngược về từng weight.",
  },
  {
    id: "token-to-attention", from: "llm-token-embedding", to: "llm-attention",
    prompt: "Trước khi tính query · key, mỗi token phải ở dạng nào?",
    options: ["Chuỗi ký tự thô", "Vector số", "Một nhãn đúng/sai"], answerIndex: 1,
    explanation: "Attention thực hiện dot product trên các vector query/key được tạo từ representation của token.",
  },
  {
    id: "backprop-to-evaluation", from: "dl-backprop", to: "ai-evaluation",
    prompt: "Training loss giảm sau update có đủ chứng minh hệ thống tốt hơn cho người dùng không?",
    options: ["Có, luôn đủ", "Không; còn cần eval theo use case và constraints", "Chỉ cần tăng số parameter"], answerIndex: 1,
    explanation: "Tối ưu tham số chỉ giải quyết training objective; hệ thống còn phải được đo trên tiêu chí và dữ liệu đại diện cho use case.",
  },
  {
    id: "attention-to-evaluation", from: "llm-attention", to: "ai-evaluation",
    prompt: "Attention giải thích cơ chế bên trong, nhưng để chọn model phục vụ thật còn cần gì?",
    options: ["Chỉ nhìn heatmap attention", "Eval quality, latency và cost trên workload thật", "Chọn model lớn nhất"], answerIndex: 1,
    explanation: "Hiểu cơ chế không thay thế evaluation end-to-end trên mục tiêu và ràng buộc vận hành.",
  },
];

export function getPrerequisiteEdge(from: ExpansionLabId, to: ExpansionLabId) {
  return prerequisiteEdges.find((edge) => edge.from === from && edge.to === to);
}

export function outgoingPrerequisiteEdges(from: ExpansionLabId) {
  return prerequisiteEdges.filter((edge) => edge.from === from);
}

export function isExpansionLabId(value: string): value is ExpansionLabId {
  return expansionLabs.some((lab) => lab.id === value);
}

export function getExpansionLab(id: string): ExpansionLab {
  return expansionLabs.find((lab) => lab.id === id) ?? expansionLabs[0];
}

export function trackLabs(trackId: ExpansionTrackId): ExpansionLab[] {
  return expansionLabs.filter((lab) => lab.trackId === trackId);
}
