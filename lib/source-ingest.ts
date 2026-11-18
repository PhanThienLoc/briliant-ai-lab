import { resolvePdfPageRange } from "./pdf-page-range.ts";
import { sourcePdfError } from "./pdf-error.ts";

const MAX_CHARS = 120_000;
export type SourceBlock = {
  ordinal: number;
  text: string;
  locator: { kind: "page"; first: number; last: number }
    | { kind: "section"; path: string[]; ordinal: number }
    | { kind: "time"; startMs: number; endMs: number };
};
export type IngestResult = {
  blocks: SourceBlock[];
  selectedUnits: number;
  processedUnits: number;
  emptyUnits: number[];
  truncated: boolean;
  lastProcessedUnit: number;
};
type PdfDocument = {
  numPages: number;
  getPage(page: number): Promise<{ getTextContent(): Promise<{ items: Array<{ str: string } | { type: string }> }> }>;
  destroy(): Promise<void>;
};
export type PdfLoader = (data: Uint8Array) => Promise<PdfDocument>;

async function loadPdf(data: Uint8Array): Promise<PdfDocument> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const task = pdfjs.getDocument({ data });
  try { return await task.promise; }
  catch (error) { await task.destroy(); throw sourcePdfError(error); }
}

/** Keep text byte-for-byte apart from the explicit character budget. Cue and heading parsing stays with the course builder. */
export function ingestText(text: string): IngestResult {
  const units = text.split(/(?<=\n[ \t]*\n)/);
  const result: IngestResult = { blocks: [], selectedUnits: units.length, processedUnits: 0, emptyUnits: [], truncated: false, lastProcessedUnit: 0 };
  let remaining = MAX_CHARS;
  for (const [index, raw] of units.entries()) {
    const ordinal = index + 1;
    result.processedUnits++;
    result.lastProcessedUnit = ordinal;
    if (!raw.trim()) result.emptyUnits.push(ordinal);
    const bounded = raw.slice(0, remaining);
    if (bounded) result.blocks.push({ ordinal, text: bounded, locator: { kind: "section", path: ["Văn bản"], ordinal } });
    remaining -= bounded.length;
    if (bounded.length < raw.length || (remaining === 0 && index < units.length - 1)) { result.truncated = true; break; }
  }
  return result;
}

export function ingestToText(result: IngestResult): string {
  if (result.blocks.every((block) => block.locator.kind !== "page")) return result.blocks.map((block) => block.text).join("");
  return result.blocks.map((block) => block.locator.kind === "page" ? `Trang ${block.locator.first}\n${block.text}` : block.text).join("\n\n");
}

export async function readSourceFile(file: File, range: { first: string; last: string }, loader: PdfLoader = loadPdf): Promise<IngestResult> {
  const isPdf = /\.pdf$/i.test(file.name);
  if (file.size > (isPdf ? 30 : 15) * 1024 * 1024) throw new Error(`Tệp vượt ${isPdf ? 30 : 15} MB. Hãy chọn một tệp nhỏ hơn.`);
  if (!isPdf) {
    if (!/\.(txt|md|markdown|srt|vtt)$/i.test(file.name)) throw new Error("Hỗ trợ PDF có lớp chữ, TXT, Markdown, SRT và VTT.");
    return ingestText(await file.text());
  }
  let document: PdfDocument;
  try { document = await loader(new Uint8Array(await file.arrayBuffer())); }
  catch (error) { throw sourcePdfError(error); }
  try {
    const selected = resolvePdfPageRange(range.first, range.last, document.numPages);
    const result: IngestResult = { blocks: [], selectedUnits: selected.last - selected.first + 1, processedUnits: 0, emptyUnits: [], truncated: false, lastProcessedUnit: selected.first - 1 };
    let remaining = MAX_CHARS;
    for (let ordinal = selected.first; ordinal <= selected.last; ordinal++) {
      const page = await document.getPage(ordinal);
      const content = (await page.getTextContent()).items.map((item) => "str" in item ? item.str : "").join(" ").trim();
      result.processedUnits++;
      result.lastProcessedUnit = ordinal;
      if (!content) { result.emptyUnits.push(ordinal); continue; }
      const overhead = `Trang ${ordinal}\n`.length + (result.blocks.length ? 2 : 0);
      const bounded = content.slice(0, Math.max(0, remaining - overhead));
      if (bounded) result.blocks.push({ ordinal, text: bounded, locator: { kind: "page", first: ordinal, last: ordinal } });
      remaining -= bounded.length + (bounded ? overhead : 0);
      if (bounded.length < content.length || (remaining === 0 && ordinal < selected.last)) { result.truncated = true; break; }
    }
    if (!result.blocks.length) throw new Error("PDF này không có lớp chữ để trích xuất. Hãy dùng bản OCR hoặc dán văn bản.");
    return result;
  } finally { await document.destroy(); }
}
