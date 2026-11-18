import type { SourceBlock } from "./source-ingest.ts";

export type SourceDocument = {
  id: string;
  name: string;
  sections: { id: string; text: string; locator: SourceBlock["locator"] }[];
};
export type EvidenceRef = { sectionId: string; quote: string };
export const MAX_DOCUMENT_CHARS = 120_000;
export const MAX_DOCUMENT_SECTIONS = 200;
export const MAX_SECTION_CHARS = 4_000;

function validLocator(locator: SourceBlock["locator"]): boolean {
  if (!locator || typeof locator !== "object") return false;
  if (locator.kind === "page") return Number.isSafeInteger(locator.first) && locator.first > 0 && Number.isSafeInteger(locator.last) && locator.last >= locator.first;
  if (locator.kind === "time") return Number.isSafeInteger(locator.startMs) && locator.startMs >= 0 && Number.isSafeInteger(locator.endMs) && locator.endMs > locator.startMs;
  return locator.kind === "section" && Number.isSafeInteger(locator.ordinal) && locator.ordinal > 0 && Array.isArray(locator.path) && locator.path.length > 0 && locator.path.every((part) => typeof part === "string" && part.trim().length > 0);
}

// Keep separators in each chunk so concatenating pieces recreates the block exactly.
function splitBlock(text: string): string[] {
  const chunks: string[] = [];
  let offset = 0;
  while (offset < text.length) {
    let size = Math.min(MAX_SECTION_CHARS, text.length - offset);
    if (offset + size < text.length) {
      const window = text.slice(offset, offset + size);
      const sentenceEnds = [...window.matchAll(/[.!?。！？](?:[ \t]+|\n+)/g)];
      const boundary = sentenceEnds.at(-1);
      const sentenceEnd = boundary ? boundary.index! + boundary[0].length : 0;
      const whitespace = Math.max(window.lastIndexOf(" "), window.lastIndexOf("\n")) + 1;
      if (sentenceEnd >= size / 2) size = sentenceEnd;
      else if (whitespace >= size / 2) size = whitespace;
      // Never split a surrogate pair even when a long token leaves no word boundary.
      else if (/[\uD800-\uDBFF]/.test(text[offset + size - 1]) && /[\uDC00-\uDFFF]/.test(text[offset + size])) size--;
    }
    chunks.push(text.slice(offset, offset + size));
    offset += size;
  }
  // A trailing separator must stay with meaningful text, not become an empty selectable section.
  for (let index = chunks.length - 1; index > 0; index--) {
    if (chunks[index].trim()) continue;
    const combined = chunks[index - 1] + chunks[index];
    if (combined.length <= MAX_SECTION_CHARS) {
      chunks.splice(index - 1, 2, combined);
      continue;
    }
    const lastContent = combined.search(/\s*$/);
    let cut = lastContent - 1;
    if (/[\uDC00-\uDFFF]/.test(combined[cut]) && /[\uD800-\uDBFF]/.test(combined[cut - 1])) cut--;
    if (cut <= 0 || combined.length - cut > MAX_SECTION_CHARS || !combined.slice(0, cut).trim()) {
      throw new Error("Mục nguồn có quá nhiều khoảng trắng liên tiếp. Hãy bỏ khoảng trắng thừa trước khi nhập.");
    }
    chunks.splice(index - 1, 2, combined.slice(0, cut), combined.slice(cut));
  }
  return chunks;
}

export function buildSourceDocument(input: { id: string; name: string; blocks: SourceBlock[] }): SourceDocument {
  if (typeof input.id !== "string" || !input.id.trim() || input.id.length > 100 || typeof input.name !== "string" || !input.name.trim() || input.name.length > 160 || !Array.isArray(input.blocks)) throw new Error("Thông tin tài liệu nguồn không hợp lệ.");
  const seen = new Set<number>();
  let characters = 0;
  const sections: SourceDocument["sections"] = [];
  for (const block of input.blocks) {
    if (!block || !Number.isSafeInteger(block.ordinal) || block.ordinal < 1 || seen.has(block.ordinal) || typeof block.text !== "string" || !validLocator(block.locator)) throw new Error("Mục hoặc vị trí nguồn không hợp lệ.");
    seen.add(block.ordinal);
    characters += block.text.length;
    if (characters > MAX_DOCUMENT_CHARS) throw new Error("Nguồn vượt 120.000 ký tự. Hãy chọn khoảng nguồn nhỏ hơn.");
    if (!block.text.trim()) continue;
    splitBlock(block.text).forEach((text, index) => {
      const locator = block.locator.kind === "section" ? { ...block.locator, path: [...block.locator.path] } : { ...block.locator };
      sections.push({ id: `${input.id}:section-${block.ordinal}:${index + 1}`, text, locator });
    });
    if (sections.length > MAX_DOCUMENT_SECTIONS) throw new Error("Tài liệu vượt 200 mục. Hãy chọn khoảng nguồn nhỏ hơn.");
  }
  if (!sections.length) throw new Error("Không có nội dung chữ trong tài liệu nguồn.");
  return { id: input.id, name: input.name, sections };
}

const normalizeQuote = (text: string) => text.replace(/\s+/g, " ").trim();
export function validateEvidence(document: SourceDocument, ref: EvidenceRef): boolean {
  if (!ref || typeof ref.sectionId !== "string" || typeof ref.quote !== "string") return false;
  const quote = normalizeQuote(ref.quote);
  const matches = document.sections.filter((section) => section.id === ref.sectionId);
  return Boolean(quote && matches.length === 1 && normalizeQuote(matches[0].text).includes(quote));
}

function formatTime(milliseconds: number): string {
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor(milliseconds % 3_600_000 / 60_000);
  const seconds = Math.floor(milliseconds % 60_000 / 1_000);
  const ms = milliseconds % 1_000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}
export function formatLocator(locator: SourceBlock["locator"]): string {
  if (locator.kind === "page") return locator.first === locator.last ? `Trang vật lý ${locator.first}` : `Trang vật lý ${locator.first}–${locator.last}`;
  if (locator.kind === "time") return `${formatTime(locator.startMs)}–${formatTime(locator.endMs)}`;
  return `Mục ${locator.ordinal}: ${locator.path.join(" › ")}`;
}

const timestamp = /^(?:(\d+):)?(\d{2}):(\d{2})[.,](\d{3})$/;
function parseTime(value: string): number {
  const parts = value.match(timestamp);
  if (!parts || Number(parts[2]) > 59 || Number(parts[3]) > 59) throw new Error("Mốc thời gian transcript không hợp lệ.");
  return ((Number(parts[1] ?? 0) * 60 + Number(parts[2])) * 60 + Number(parts[3])) * 1000 + Number(parts[4]);
}

/** Build coverage without calling the sampled six-lesson practice builder. */
export function documentFromText(id: string, name: string, text: string): SourceDocument {
  if (typeof text !== "string" || text.length > MAX_DOCUMENT_CHARS) throw new Error("Nguồn vượt 120.000 ký tự. Hãy chọn khoảng nguồn nhỏ hơn.");
  const normalized = text.replace(/\r\n?/g, "\n");
  const blocks: SourceBlock[] = [];
  const add = (content: string, locator: SourceBlock["locator"]) => {
    if (content.trim()) blocks.push({ ordinal: blocks.length + 1, text: content, locator });
  };
  const pages = [...normalized.matchAll(/^Trang (\d+)\n/gm)];
  if (pages.length) {
    const prelude = normalized.slice(0, pages[0].index);
    add(prelude, { kind: "section", path: ["Văn bản trước trang"], ordinal: 1 });
    pages.forEach((match, index) => {
      const page = Number(match[1]);
      add(normalized.slice(match.index! + match[0].length, pages[index + 1]?.index ?? normalized.length), { kind: "page", first: page, last: page });
    });
  } else if (/^.*\d{2}:\d{2}[.,]\d{3}\s+-->/m.test(normalized)) {
    const cueBlocks = normalized.split(/\n[ \t]*\n+/);
    for (const cue of cueBlocks) {
      const lines = cue.split("\n");
      const timeIndex = lines.findIndex((line) => line.includes("-->"));
      if (timeIndex < 0) {
        if (!cue.trim() || /^(?:WEBVTT(?:[^\n]*)?|NOTE\b|STYLE\b|REGION\b)/.test(cue.trim())) continue;
        add(cue, { kind: "section", path: ["Văn bản ngoài phụ đề"], ordinal: blocks.length + 1 });
        continue;
      }
      const times = lines[timeIndex].match(/^\s*(\S+)\s+-->\s+(\S+)(?:\s+.*)?$/);
      if (!times) throw new Error("Mốc thời gian transcript không hợp lệ.");
      const startMs = parseTime(times[1]), endMs = parseTime(times[2]);
      if (endMs <= startMs) throw new Error("Mốc kết thúc transcript đứng trước mốc bắt đầu.");
      add(lines.slice(timeIndex + 1).join("\n"), { kind: "time", startMs, endMs });
    }
  } else {
    const headings = [...normalized.matchAll(/^(#{1,6})[ \t]+([^\n]+)$/gm)];
    if (headings.length) {
      add(normalized.slice(0, headings[0].index), { kind: "section", path: ["Mở đầu"], ordinal: 1 });
      const path: { depth: number; title: string }[] = [];
      headings.forEach((match, index) => {
        const depth = match[1].length;
        while (path.length && path[path.length - 1].depth >= depth) path.pop();
        path.push({ depth, title: match[2].trim() });
        // Heading remains part of the text; coverage retains all supplied words.
        add(normalized.slice(match.index!, headings[index + 1]?.index ?? normalized.length), { kind: "section", path: path.map((item) => item.title), ordinal: index + 1 });
      });
    } else {
      normalized.split(/(?<=\n[ \t]*\n)/).forEach((paragraph, index) => add(paragraph, { kind: "section", path: ["Văn bản"], ordinal: index + 1 }));
    }
  }
  return buildSourceDocument({ id, name, blocks });
}
