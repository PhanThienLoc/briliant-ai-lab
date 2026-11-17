// Short counterexamples are scaffolds; these choices never write mastery or resolve a repair item.
const cards = {
  "frame-explain": {
    counterexample: "Một model dự đoán rất chính xác nhưng nhóm vận hành không biết nên hành động với ai, vào lúc nào hoặc đánh đổi chi phí nào. Accuracy cao vẫn không tạo ra quyết định hữu ích.",
    question: "Một đội có classifier 95% accuracy nhưng chưa xác định hành động sau dự đoán. Họ nên làm gì trước khi tối ưu model?",
    options: ["Tăng số lớp của model để cải thiện accuracy", "Xác định quyết định, mục tiêu và thước đo gắn với hành động", "Bỏ tập đánh giá vì accuracy đã đủ cao"], correctIndex: 1,
    explanation: "Cần đóng khung quyết định và tiêu chí thành công trước; accuracy đứng một mình không cho biết sản phẩm có giải quyết đúng việc hay không.",
  },
  "dfl-explain": {
    counterexample: "Dự đoán khách sẽ hủy đơn lúc 9 giờ sáng mà dùng trạng thái hoàn tiền lúc 17 giờ làm feature sẽ cho điểm thử nghiệm đẹp nhưng không thể chạy khi cần quyết định.",
    question: "Muốn dự đoán hủy đơn vào 9 giờ sáng, cột nào là feature hợp lệ?",
    options: ["Trạng thái hoàn tiền ghi vào cuối ngày", "Lý do hủy được khách nhập sau khi hủy", "Lịch sử đặt hàng đã có trước 9 giờ"], correctIndex: 2,
    explanation: "Feature phải sẵn có ở mốc dự đoán. Thông tin phát sinh sau 9 giờ là tương lai và sẽ gây leakage nếu được dùng lúc huấn luyện.",
  },
  "dq-explain": {
    counterexample: "Một ô giá trống là missing; giá âm là invalid; giá đúng từ năm ngoái nhưng đã đổi hôm nay là stale. Cùng một cột vẫn có ba cơ chế hỏng khác nhau.",
    question: "Bảng giá có đủ ô và toàn giá dương nhưng chưa cập nhật sau đợt đổi giá. Lỗi chính là gì?",
    options: ["Dữ liệu stale vì không còn đúng thời điểm sử dụng", "Dữ liệu missing vì không có dòng mới", "Dữ liệu invalid vì giá là số dương"], correctIndex: 0,
    explanation: "Completeness và validity vẫn có thể đạt trong khi freshness thất bại. Quy tắc kiểm tra cần gắn với thời điểm dữ liệu còn hiệu lực.",
  },
  "fn-explain": {
    counterexample: "Bước chuẩn hóa trả về danh sách số, nhưng bước tính tổng tiếp theo lại chờ một object có trường amount. Cả hai hàm riêng lẻ có thể chạy, chuỗi pipeline vẫn vỡ.",
    question: "Một bước pipeline đổi output từ số sang chuỗi mà bước sau vẫn cộng số. Cần kiểm tra mối nối nào?",
    options: ["Chỉ kiểm tra tên hàm đầu tiên", "Hợp đồng kiểu và shape giữa output bước trước với input bước sau", "Chỉ tăng tốc bước cuối cùng"], correctIndex: 1,
    explanation: "Pipeline là các phép biến đổi nối tiếp; output của bước trước phải đáp ứng kiểu và cấu trúc mà input của bước sau yêu cầu.",
  },
  "vec-explain": {
    counterexample: "Nếu feature x tăng từ 1 lên 100 nhưng weight tương ứng bằng 0, đóng góp x×w vẫn bằng 0. Chỉ nhìn giá trị feature lớn sẽ đoán sai prediction.",
    question: "Hai feature đều tăng, nhưng feature thứ hai có weight bằng 0. Điều gì xảy ra với đóng góp của nó vào dot product?",
    options: ["Đóng góp bằng 0 vì giá trị được nhân với weight 0", "Đóng góp luôn tăng theo giá trị feature", "Prediction bắt buộc bằng 0 dù feature kia có weight khác 0"], correctIndex: 0,
    explanation: "Mỗi thành phần đóng góp xᵢ×wᵢ trước khi cộng. Weight 0 loại đóng góp của đúng feature đó, không xóa mọi đóng góp khác.",
  },
  "lm-explain": {
    counterexample: "Đổi bias từ 2 lên 5 làm mọi prediction tăng 3 kể cả khi x=0; đổi weight chỉ làm mức thay đổi theo x khác đi. Hai thao tác không tương đương.",
    question: "Với y = wx + b, muốn tăng mọi prediction cùng 3 đơn vị mà giữ độ dốc, nên thay gì?",
    options: ["Tăng weight thêm 3", "Nhân input với 3", "Tăng bias thêm 3"], correctIndex: 2,
    explanation: "Bias dịch mốc nền của đường dự đoán, còn weight điều khiển độ dốc và mức ảnh hưởng của feature khi input thay đổi.",
  },
  "res-explain": {
    counterexample: "Hai mẫu có residual +10 và −10 cho trung bình bằng 0 nhưng cả hai đều sai 10 đơn vị. Dấu triệt tiêu không có nghĩa lỗi biến mất.",
    question: "Residual của hai mẫu là +8 và −8. Có thể kết luận model dự đoán chính xác vì trung bình bằng 0 không?",
    options: ["Có, vì hai sai số đã loại bỏ nhau hoàn toàn", "Không, độ lớn lỗi vẫn là 8 ở mỗi mẫu dù dấu triệt tiêu", "Có, vì residual âm luôn tốt hơn residual dương"], correctIndex: 1,
    explanation: "Residual có dấu cho biết hướng dự đoán thiếu hoặc thừa. Trung bình có dấu che mất độ lớn lỗi khi các dấu bù nhau.",
  },
  "mse-explain": {
    counterexample: "Một lỗi 10 đơn vị đóng góp 100 vào tổng bình phương, còn lỗi 1 chỉ đóng góp 1. MAE nhận lần lượt 10 và 1, nên MSE khuếch đại outlier mạnh hơn.",
    question: "Nếu một residual tăng từ 2 lên 10, đóng góp của nó vào MSE thay đổi như thế nào trước bước lấy trung bình?",
    options: ["Từ 2 lên 10, tức gấp 5 lần", "Không đổi vì sai số sẽ được trung bình", "Từ 4 lên 100, tức gấp 25 lần"], correctIndex: 2,
    explanation: "Bình phương biến 2 thành 4 và 10 thành 100. Chính phép bình phương khiến MSE nhạy hơn MAE với lỗi lớn.",
  },
  "der-explain": {
    counterexample: "Ở đỉnh của một đường cong, đạo hàm có thể bằng 0 nhưng đường cong vẫn tăng ở phía trước và giảm ở phía sau. Một độ dốc tại một điểm không mô tả cả hàm.",
    question: "Đạo hàm của một hàm tại x = 0 bằng 0. Kết luận nào chắc chắn đúng?",
    options: ["Hàm không thay đổi tại mọi x", "Độ nhạy cục bộ quanh x = 0 bằng 0, cần thêm điểm để hiểu cả hàm", "Mọi đầu ra của hàm đều bằng 0"], correctIndex: 1,
    explanation: "Đạo hàm là tốc độ đổi cục bộ khi đầu vào dịch rất nhỏ quanh điểm xét, không phải bản mô tả toàn bộ hình dạng hàm.",
  },
  "grad-explain": {
    counterexample: "Loss theo hai weight có độ nhạy [2, −3]. Một đạo hàm riêng không nói weight còn lại nên tăng hay giảm; gradient chứa cả hai hướng cùng lúc.",
    question: "Gradient theo hai tham số là [2, −3]. Gradient descent với learning rate dương nên làm gì?",
    options: ["Giảm tham số thứ nhất và tăng tham số thứ hai", "Tăng cả hai tham số cùng lúc", "Chỉ cập nhật tham số thứ nhất"], correctIndex: 0,
    explanation: "Gradient là vector các đạo hàm riêng. Đi ngược vector đó làm tham số có thành phần dương giảm và thành phần âm tăng.",
  },
  "lr-explain": {
    counterexample: "Đi xuống một thung lũng bằng bước quá dài có thể nhảy qua đáy rồi lặp qua lại; bước cực ngắn thì tiến chậm. Gradient đúng chưa đủ nếu kích thước bước sai.",
    question: "Loss dao động qua lại hai phía của đáy dù gradient được tính đúng. Thay đổi nào hợp lý nhất?",
    options: ["Tăng learning rate để nhảy xa hơn", "Bỏ tính gradient và chọn ngẫu nhiên", "Giảm learning rate để tránh vượt qua đáy"], correctIndex: 2,
    explanation: "Update bằng learning rate nhân gradient. Khi bước quá lớn, tham số có thể vượt vùng loss thấp và gây dao động thay vì hội tụ.",
  },
  "scratch-explain": {
    counterexample: "Một training loop chỉ tính loss rồi in ra mà không cập nhật parameter sẽ lặp cùng prediction mãi. Feedback phải quay trở lại thay đổi model ở vòng sau.",
    question: "Một vòng lặp tính prediction và loss nhưng không cập nhật weight. Điều gì thiếu để model học?",
    options: ["Thêm nhiều lệnh in loss", "Dùng gradient để cập nhật parameter rồi tính lại prediction", "Cho test set vào mỗi vòng để chọn weight"], correctIndex: 1,
    explanation: "Vòng feedback nối prediction, loss và gradient với một bước cập nhật parameter; đầu ra mới mới cho biết việc sửa có hiệu quả hay không.",
  },
  "val-explain": {
    counterexample: "Train loss tiếp tục giảm trong khi validation loss tăng là dấu hiệu model khớp mẫu đã xem nhưng kém trên mẫu chưa xem. Cùng cao ở cả hai tập lại nghiêng về underfitting.",
    question: "Train loss thấp và tiếp tục giảm, validation loss tăng. Đây là tín hiệu nào?",
    options: ["Overfitting vì khoảng cách train–validation đang nới rộng", "Underfitting vì cả hai tập đều chưa khớp", "Bằng chứng test set đã được dùng đúng"], correctIndex: 0,
    explanation: "Khi model ngày càng khớp train nhưng hiệu năng validation xấu đi, khả năng tổng quát hóa giảm; đó là overfitting.",
  },
  "cap-explain": {
    counterexample: "Một model đạt score cao trên dữ liệu cũ nhưng dữ liệu vận hành hôm nay thiếu cột đầu vào. Score không cứu được pipeline không thể tạo quyết định đúng hạn.",
    question: "Model có score tốt nhưng pipeline production thiếu feature ở thời điểm dự đoán. Đánh giá dự án nên làm gì?",
    options: ["Công bố thành công vì score là thước đo duy nhất", "Bỏ kiểm tra dữ liệu và tin score offline", "Kiểm tra lại dữ liệu, mốc thời gian và tác động đến quyết định thực"], correctIndex: 2,
    explanation: "Dự án end-to-end cần khung quyết định, dữ liệu hợp lệ, split đúng, pipeline khả dụng và đánh giá phù hợp; score chỉ là một mắt xích.",
  },
};

export function clinicForRepair(activityId) {
  return Object.hasOwn(cards, activityId) ? cards[activityId] : null;
}

export function gradeClinicChoice(card, choice) {
  return Boolean(card && Number.isInteger(choice) && choice >= 0 && choice < card.options.length && choice === card.correctIndex);
}
