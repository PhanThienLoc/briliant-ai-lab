import type { SourceKind } from "./source-course.ts";
import type { IngestResult, SourceBlock } from "./source-ingest.ts";
import type { SourceDocument } from "./source-document.ts";

export const SOURCE_DRAFTS_KEY = "briliantai.source-drafts.v2";
export const MAX_COVERAGE_DRAFTS = 10;
export const MAX_COVERAGE_DRAFT_CHARS = 2_000_000;

export type CoverageDraft = {
  version: 2;
  id: string;
  title: string;
  kind: SourceKind;
  sourceUrl?: string;
  document: SourceDocument;
  selectedSectionIds: string[];
  coverage: Omit<IngestResult, "blocks">;
  updatedAt: string;
};

type ReadStorage = Pick<Storage, "getItem">;
type WriteStorage = Pick<Storage, "getItem" | "setItem">;
const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const integer = (value: unknown, minimum = 0): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= minimum;
const text = (value: unknown, max: number): value is string => typeof value === "string" && Boolean(value.trim()) && value.length <= max;
const fail = (): never => { throw new Error("Bản nháp độ phủ không hợp lệ. Dữ liệu đã lưu chưa bị thay đổi."); };

function validLocator(value: unknown): value is SourceBlock["locator"] {
  if (!record(value)) return false;
  if (value.kind === "page") return integer(value.first, 1) && integer(value.last, value.first);
  if (value.kind === "time") return integer(value.startMs) && integer(value.endMs, value.startMs + 1);
  return value.kind === "section" && integer(value.ordinal, 1) && Array.isArray(value.path)
    && value.path.length > 0 && value.path.length <= 20 && value.path.every((part) => text(part, 1000));
}

function validateDraft(value: unknown): asserts value is CoverageDraft {
  if (!record(value) || value.version !== 2 || !text(value.id, 160) || typeof value.title !== "string" || value.title.length > 100
    || !["video", "paper", "book", "article"].includes(value.kind as string)
    || (value.sourceUrl !== undefined && (typeof value.sourceUrl !== "string" || value.sourceUrl.length > 2048 || !/^https?:\/\/\S+$/i.test(value.sourceUrl)))
    || typeof value.updatedAt !== "string" || !value.updatedAt.trim() || !Number.isFinite(Date.parse(value.updatedAt))) return fail();
  const document = value.document;
  if (!record(document) || !text(document.id, 160) || !text(document.name, 160) || !Array.isArray(document.sections)
    || document.sections.length < 1 || document.sections.length > 200) return fail();
  const ids = new Set<string>();
  let characters = 0;
  for (const section of document.sections) {
    if (!record(section) || !text(section.id, 300) || ids.has(section.id) || !text(section.text, 4000) || !validLocator(section.locator)) return fail();
    ids.add(section.id);
    characters += section.text.length;
  }
  if (characters > 120_000 || !Array.isArray(value.selectedSectionIds)
    || value.selectedSectionIds.some((id) => typeof id !== "string" || !ids.has(id))
    || new Set(value.selectedSectionIds).size !== value.selectedSectionIds.length) return fail();
  const coverage = value.coverage;
  if (!record(coverage) || !integer(coverage.selectedUnits, 1) || !integer(coverage.processedUnits, 1)
    || coverage.processedUnits > coverage.selectedUnits || !integer(coverage.lastProcessedUnit, coverage.processedUnits)
    || typeof coverage.truncated !== "boolean" || (!coverage.truncated && coverage.processedUnits !== coverage.selectedUnits)
    || !Array.isArray(coverage.emptyUnits) || coverage.emptyUnits.length > coverage.processedUnits
    || coverage.emptyUnits.some((unit) => !integer(unit, (coverage.lastProcessedUnit as number) - (coverage.processedUnits as number) + 1) || unit > (coverage.lastProcessedUnit as number))
    || new Set(coverage.emptyUnits).size !== coverage.emptyUnits.length) return fail();
}

export function parseCoverageDrafts(raw: string): CoverageDraft[] {
  if (raw.length > MAX_COVERAGE_DRAFT_CHARS) throw new Error("Các bản nháp quá lớn. Hãy chọn nguồn ngắn hơn hoặc xóa bản nháp không cần dùng.");
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value) || value.length > MAX_COVERAGE_DRAFTS) return fail();
  const ids = new Set<string>();
  for (const draft of value) {
    validateDraft(draft);
    if (ids.has(draft.id)) return fail();
    ids.add(draft.id);
  }
  return value;
}

export function readCoverageDrafts(getStorage: () => ReadStorage): { drafts: CoverageDraft[] | null; error: string | null } {
  try {
    const raw = getStorage().getItem(SOURCE_DRAFTS_KEY);
    return { drafts: raw === null ? [] : parseCoverageDrafts(raw), error: null };
  } catch {
    return { drafts: null, error: "Không đọc được bản nháp độ phủ. Dữ liệu cũ được giữ nguyên; hãy kiểm tra quyền lưu trữ hoặc sao lưu trước khi xóa." };
  }
}

function currentDrafts(storage: ReadStorage): CoverageDraft[] {
  const raw = storage.getItem(SOURCE_DRAFTS_KEY);
  return raw === null ? [] : parseCoverageDrafts(raw);
}

function writeDrafts(storage: WriteStorage, drafts: CoverageDraft[]) {
  const serialized = JSON.stringify(drafts);
  parseCoverageDrafts(serialized);
  try { storage.setItem(SOURCE_DRAFTS_KEY, serialized); }
  catch { throw new Error("Không lưu được bản nháp: bộ nhớ đầy hoặc bị chặn. Bản đã lưu trước đó chưa thay đổi."); }
}

export function saveCoverageDraft(storage: WriteStorage, draft: CoverageDraft): void {
  validateDraft(draft);
  const drafts = currentDrafts(storage);
  const index = drafts.findIndex((saved) => saved.id === draft.id);
  if (index >= 0) drafts[index] = draft;
  else drafts.push(draft);
  if (drafts.length > MAX_COVERAGE_DRAFTS) throw new Error("Đã có 10 bản nháp. Hãy xóa bản không cần dùng trước khi lưu thêm.");
  writeDrafts(storage, drafts);
}

export function deleteCoverageDraft(storage: WriteStorage, id: string): void {
  if (!text(id, 160)) return fail();
  const drafts = currentDrafts(storage);
  if (!drafts.some((draft) => draft.id === id)) return;
  writeDrafts(storage, drafts.filter((draft) => draft.id !== id));
}
