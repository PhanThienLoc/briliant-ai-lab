import assert from "node:assert/strict";
import test from "node:test";
import { sourcePdfError } from "../lib/pdf-error.ts";

test("password PDF errors explain unlocking locally in Vietnamese", () => {
 for (const code of [1, 2]) {
  const message = sourcePdfError({ name: "PasswordException", code, message: "Password required" });
  assert.match(message.message, /mật khẩu/);
  assert.match(message.message, /mở khóa.*PDF/i);
  assert.doesNotMatch(message.message, /Password required/);
 }
});
test("corrupt PDF errors give Vietnamese recovery guidance", () => {
 for (const name of ["InvalidPDFException", "FormatError"]) {
  assert.match(sourcePdfError({ name, message: "Invalid PDF structure" }).message, /PDF.*hỏng.*tải lại/i);
 }
});
test("range, text-layer and unrelated errors retain their existing guidance", () => {
 const original = new Error("PDF này không có lớp chữ để trích xuất.");
 assert.equal(sourcePdfError(original), original);
 assert.equal(sourcePdfError({ name: "UnknownErrorException", message: "worker unavailable" }).message, "worker unavailable");
});
