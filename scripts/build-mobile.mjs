import { cp, lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, symlink, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const isEnvironmentName = (name) => name === ".env" || name.startsWith(".env.");
const privateOutputNames = new Set([
  ".git", ".openai", ".agents", ".toolchains", "node_modules", ".npmrc",
  ".yarnrc", ".yarnrc.yml", "hosting.json", "tauri.conf.json", "rust-toolchain.toml",
  "Cargo.toml", "Cargo.lock", "package.json", "package-lock.json", "local.properties",
  "key.properties", "keystore.properties", "signing.properties",
]);

export async function copyMobileTree(source, destination) {
  await cp(source, destination, {
    recursive: true,
    filter: async (path) => {
      if (isEnvironmentName(basename(path))) return false;
      // A harmless filename must not alias a private file outside the source tree.
      if ((await lstat(path)).isSymbolicLink()) throw new Error(`Symbolic link in mobile source: ${basename(path)}`);
      return true;
    },
  });
}

// Reject private configuration before replacing a previously successful export.
// Ordinary public JSON, workers, fonts, images and static RSC payloads remain valid.
export async function assertPublicMobileOutput(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (isEnvironmentName(entry.name) || privateOutputNames.has(entry.name)
      || /\.(?:jks|keystore|p12|pfx)$/i.test(entry.name)) {
      throw new Error(`Private configuration in mobile output: ${entry.name}`);
    }
    if (entry.isSymbolicLink()) throw new Error(`Symbolic link in mobile output: ${entry.name}`);
    if (entry.isDirectory()) await assertPublicMobileOutput(path);
  }
}

async function buildMobile() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const scratch = await mkdtemp(join(tmpdir(), "brilliant-mobile-"));
  const output = join(root, "dist/mobile");
  try {
    const sources = [
      "app", "components", "content", "lib", "public", "build", "drizzle",
      "worker", "scripts", "types", ".openai/hosting.json", "package.json",
      "tsconfig.json", "vite.config.ts", "postcss.config.mjs", "next.config.ts",
    ];
    for (const name of sources) {
      await mkdir(dirname(join(scratch, name)), { recursive: true });
      await copyMobileTree(join(root, name), join(scratch, name));
    }
    await symlink(join(root, "node_modules"), join(scratch, "node_modules"), "dir");
    await rename(join(scratch, "next.config.ts"), join(scratch, "web-next.config.ts"));
    await writeFile(join(scratch, "next.config.ts"),
      'import webConfig from "./web-next.config";\nexport default { ...webConfig, output: "export" };\n');
    const result = spawnSync("bash", ["scripts/sites-env.sh", "--", "timeout", "180s",
      "node", "node_modules/vinext/dist/cli.js", "build"], { cwd: scratch, stdio: "inherit" });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Static frontend build failed (exit ${result.status}, signal ${result.signal}).`);
    const exported = join(scratch, "dist/client");
    await readFile(join(exported, "index.html"));
    await assertPublicMobileOutput(exported);
    await mkdir(dirname(output), { recursive: true });
    await rm(output, { recursive: true, force: true });
    await cp(exported, output, { recursive: true });
    console.log(`Static mobile frontend: ${output}`);
    console.log("Public-output audit passed: no environment files or private build configuration.");
    console.log("AI and URL import still require transport adapters; this is a feasibility shell.");
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildMobile();
}
