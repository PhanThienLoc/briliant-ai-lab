import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("HTML is never cached across deployments while hashed assets stay immutable", async () => {
  const headers = await readFile(new URL("../public/_headers", import.meta.url), "utf8");

  assert.match(headers, /\/\s+Cache-Control: no-cache, no-store, must-revalidate/);
  assert.match(headers, /\/assets\/\*\s+Cache-Control: public, max-age=31536000, immutable/);
});

test("a stale lazy asset triggers one guarded reload", async () => {
  const dashboard = await readFile(new URL("../app/learning-dashboard.tsx", import.meta.url), "utf8");

  assert.match(dashboard, /ASSET_RECOVERY_KEY/);
  assert.match(dashboard, /window\.addEventListener\("error", onAssetError, true\)/);
  assert.match(dashboard, /window\.addEventListener\("unhandledrejection", onUnhandledRejection\)/);
  assert.match(dashboard, /window\.location\.reload\(\)/);
  assert.match(dashboard, /sessionStorage\.getItem\(ASSET_RECOVERY_KEY\) === "reloading"/);
});

test("reload hydration defers local-only learning state until after mount", async () => {
  const [adaptiveHub, workbench] = await Promise.all([
    readFile(new URL("../components/learning/adaptive-hub.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/expansion-workbench.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(adaptiveHub, /useState<AdaptiveHubState>\(initialAdaptiveHubState\)/);
  assert.match(adaptiveHub, /useEffect\(\(\) =>/);
  assert.match(adaptiveHub, /createLocalStorageLearningRepository\(window\.localStorage\)/);
  assert.doesNotMatch(adaptiveHub, /useState<AdaptiveHubState>\(\(\)\s*=>/);
  assert.match(adaptiveHub, /let cancelled = false/);
  assert.match(adaptiveHub, /if \(cancelled\) return/);
  assert.match(adaptiveHub, /cancelled = true/);
  assert.match(workbench, /useState<ExpansionProgress>\(emptyExpansionProgress\)/);
  assert.match(workbench, /const restored = readProgress\(\)/);
  assert.match(workbench, /setProgress\(restored\)/);
  assert.match(workbench, /if \(!hydrated\) return/);
});
