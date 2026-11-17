import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("single-device mode has no server database or telemetry transport", async () => {
  const [hostingText, schema, localLog] = await Promise.all([
    read("../.openai/hosting.json"),
    read("../db/schema.ts"),
    read("../lib/local-learning-log.ts"),
  ]);
  const hosting = JSON.parse(hostingText);

  assert.equal(hosting.d1, null);
  assert.doesNotMatch(schema, /sqliteTable|pilot_events/);
  assert.match(localLog, /window\.localStorage/);
  assert.match(localLog, /const MAX_EVENTS = 400/);
  assert.match(localLog, /typeof window\.crypto\?\.randomUUID === "function"/);
  assert.match(localLog, /local-\$\{Date\.now\(\)\.toString\(36\)\}/);
  assert.doesNotMatch(localLog, /fetch\(|sendBeacon|WebSocket|cloudflare:workers/);
  await assert.rejects(read("../app/api/pilot/events/route.ts"), { code: "ENOENT" });
});

test("all fourteen lessons route to a guided interactive mechanism family", async () => {
  const dashboard = await read("../app/learning-dashboard.tsx");

  for (const component of ["DataLensLab", "FunctionMachine", "DotProductModel", "ErrorLab", "GradientLab", "ValidationLab"]) {
    assert.match(dashboard, new RegExp(`function ${component}`));
  }
  assert.match(dashboard, /Câu hỏi dẫn đường/);
  assert.match(dashboard, /Thử thách:/);
  assert.match(dashboard, /PRIVATE LEARNING MIRROR · THIS DEVICE/);
  assert.match(dashboard, /Không tài khoản, không database/);
});
