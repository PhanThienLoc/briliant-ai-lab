import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Python runner is disposable and resource-bounded", async () => {
  const runner = await readFile(new URL("../lib/python-runner.ts", import.meta.url), "utf8");
  const dashboard = await readFile(new URL("../app/learning-dashboard.tsx", import.meta.url), "utf8");

  assert.match(runner, /new Worker\("\/python-worker\.mjs"/);
  assert.match(runner, /EXECUTION_TIMEOUT_MS = 2_500/);
  assert.match(runner, /BOOT_TIMEOUT_MS = 30_000/);
  assert.match(runner, /worker\.terminate\(\)/);
  assert.match(runner, /function createRunId\(\)/);
  assert.match(runner, /typeof crypto !== "undefined"/);
  assert.match(runner, /let settled = false/);
  assert.match(runner, /Không thể mở Python worker/);
  assert.match(dashboard, /try \{\s*result = await runPythonLab/);
  assert.match(dashboard, /finally \{\s*setRunnerPhase\(null\)/);
});

test("Python sandbox rejects ambient capabilities before execution", async () => {
  const worker = await readFile(new URL("../public/python-worker.mjs", import.meta.url), "utf8");

  assert.match(worker, /MAX_CODE_LENGTH = 5000/);
  assert.match(worker, /MAX_OUTPUT_LENGTH = 4000/);
  assert.match(worker, /ast\.Import, ast\.ImportFrom/);
  assert.match(worker, /"open", "eval", "exec", "compile", "__import__"/);
  assert.match(worker, /node\.attr\.startswith\("_"\)/);
  assert.match(worker, /Network access is disabled/);
  assert.match(worker, /SafetyVisitor\(\)\.visit\(tree\)/);
  assert.match(worker, /class CappedOutput/);
  assert.match(worker, /MAX_RANGE_LENGTH = 100_000/);
});
