export const MAX_PDF_PAGES = 60;

export function resolvePdfPageRange(firstInput: string, lastInput: string, pageCount: number): { first: number; last: number } {
  const firstText = firstInput.trim();
  const lastText = lastInput.trim();
  if (!/^[1-9]\d*$/.test(firstText) || (lastText && !/^[1-9]\d*$/.test(lastText))) {
    throw new Error("Số trang phải là số nguyên dương.");
  }
  const first = Number(firstText);
  const last = lastText ? Number(lastText) : Math.min(pageCount, first + MAX_PDF_PAGES - 1);
  if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last) || first > pageCount || last > pageCount) {
    throw new Error(`PDF có ${pageCount} trang. Hãy chọn trang nằm trong tài liệu.`);
  }
  if (last < first) throw new Error("Trang kết thúc phải từ trang bắt đầu trở đi.");
  if (last - first + 1 > MAX_PDF_PAGES) throw new Error(`Mỗi lượt chỉ trích xuất tối đa ${MAX_PDF_PAGES} trang.`);
  return { first, last };
}
