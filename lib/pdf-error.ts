/** Translate PDF.js document failures while preserving extraction/range guidance. */
export function sourcePdfError(error: unknown): Error {
  const detail = error && typeof error === "object" ? error as { name?: unknown; message?: unknown } : null;
  if (detail?.name === "PasswordException") {
    return new Error("PDF được bảo vệ bằng mật khẩu. Hãy mở khóa và lưu một bản PDF trên thiết bị của ông, rồi chọn lại tệp.");
  }
  if (detail?.name === "InvalidPDFException" || detail?.name === "FormatError") {
    return new Error("PDF bị hỏng hoặc không đúng định dạng. Hãy tải lại tệp từ nguồn hoặc xuất một bản PDF mới rồi thử lại.");
  }
  return error instanceof Error ? error : new Error(typeof detail?.message === "string" ? detail.message : "Không thể đọc PDF. Hãy chọn lại tệp hoặc dán văn bản.");
}
