import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const cli = fileURLToPath(new URL("./node_modules/@tauri-apps/cli/tauri.js", import.meta.url));
if (!existsSync(cli)) {
  console.error("Tauri CLI missing. Run npm ci --prefix src-tauri/tools --ignore-scripts first.");
  process.exit(69);
}
const result = spawnSync(process.execPath, [cli, ...process.argv.slice(2)], {
  cwd: fileURLToPath(new URL("../../", import.meta.url)), stdio: "inherit",
});
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
