import assert from "node:assert/strict";
import test from "node:test";
import { resolvePdfPageRange } from "../lib/pdf-page-range.ts";

test("PDF range defaults to a 60-page window and retains physical page numbers", () => {
  assert.deepEqual(resolvePdfPageRange("61", "", 244), { first: 61, last: 120 });
  assert.deepEqual(resolvePdfPageRange("230", "", 244), { first: 230, last: 244 });
  assert.deepEqual(resolvePdfPageRange("1", "", 12), { first: 1, last: 12 });
  assert.deepEqual(resolvePdfPageRange("61", "65", 244), { first: 61, last: 65 });
});

test("PDF range rejects missing, reversed, out-of-document and oversized windows", () => {
  for (const [first, last, total] of [["", "", 244], ["0", "", 244], ["1.5", "", 244], ["61", "60", 244], ["245", "", 244], ["61", "245", 244], ["1", "61", 244]]) {
    assert.throws(() => resolvePdfPageRange(first, last, total), /trang|Trang/);
  }
});
