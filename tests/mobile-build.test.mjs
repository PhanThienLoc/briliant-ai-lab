import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { copyMobileTree, assertPublicMobileOutput } from "../scripts/build-mobile.mjs";

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "mobile-export-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

async function put(root, name, text) {
  await mkdir(dirname(join(root, name)), { recursive: true });
  await writeFile(join(root, name), text);
}

test("mobile copy excludes nested environment files and directories while preserving public assets", async (t) => {
  const root = await fixture(t);
  const source = join(root, "source");
  const output = join(root, "output");
  const privatePaths = [".env", "app/nested/.env.local", "public/deep/.env", "public/deep/.env.production", "public/.env.hidden/secret.txt"];
  for (const name of privatePaths) await put(source, name, "SYNTHETIC_SECRET_MUST_NOT_BE_EXPORTED");
  const assets = {
    "public/fonts/vi.woff2": "FONT_FIXTURE",
    "public/pdf.worker.min.mjs": "export const worker = true;",
    "public/nested/settings.json": '{"public":true}',
    "public/.env-logo.svg": "<svg/>",
    "app/nested/view.tsx": "export const title = 'Tiếng Việt';",
  };
  for (const [name, content] of Object.entries(assets)) await put(source, name, content);
  await copyMobileTree(source, output);
  for (const name of privatePaths) await assert.rejects(readFile(join(output, name)), { code: "ENOENT" });
  for (const [name, content] of Object.entries(assets)) assert.equal(await readFile(join(output, name), "utf8"), content);
  const publicOutput = join(root, "public-output");
  await copyMobileTree(join(source, "public"), publicOutput);
  await assertPublicMobileOutput(publicOutput);
  assert.ok((await readdir(publicOutput)).includes("pdf.worker.min.mjs"));
});

test("mobile output audit rejects nested environment files, private configs and signing material", async (t) => {
  const root = await fixture(t);
  for (const name of ["assets/deep/.env.local", "assets/.env", ".openai/hosting.json", "assets/.npmrc", "config/tauri.conf.json", "package-lock.json", "release/key.jks"]) {
    const output = await mkdtemp(join(root, "output-"));
    await put(output, name, "SYNTHETIC_PRIVATE_CONFIGURATION");
    await assert.rejects(assertPublicMobileOutput(output), /Private configuration in mobile output/);
  }
});

test("mobile output audit rejects symbolic links to files outside the export", async (t) => {
  const root = await fixture(t);
  await put(root, "private/.env", "SYNTHETIC_SECRET");
  const output = join(root, "output");
  await mkdir(output);
  await symlink(join(root, "private/.env"), join(output, "innocent.txt"));
  await assert.rejects(assertPublicMobileOutput(output), /Symbolic link in mobile output/);
});

test("mobile source copy refuses symbolic link aliases to private environment files", async (t) => {
  const root = await fixture(t);
  await put(root, "private/.env", "SYNTHETIC_SECRET");
  const source = join(root, "source");
  await mkdir(join(source, "public"), { recursive: true });
  await symlink(join(root, "private/.env"), join(source, "public/settings.json"));
  await assert.rejects(copyMobileTree(source, join(root, "output")), /Symbolic link in mobile source/);
});

test("Android project source stays trackable while build outputs and signing state stay ignored", () => {
  const ignored = (name) => {
    try { execFileSync("git", ["check-ignore", "-q", "--", name]); return true; }
    catch (error) { if (error.status === 1) return false; throw error; }
  };
  for (const name of ["src-tauri/gen/android/app/build.gradle.kts", "src-tauri/gen/android/gradle/wrapper/gradle-wrapper.properties", "src-tauri/gen/android/app/src/main/AndroidManifest.xml"]) assert.equal(ignored(name), false, name);
  for (const name of ["src-tauri/tools/node_modules", "src-tauri/gen/android/.gradle/cache", "src-tauri/gen/android/app/build/classes.bin", "src-tauri/gen/android/local.properties", "src-tauri/gen/android/signing.properties", "src-tauri/gen/android/key.jks"]) assert.equal(ignored(name), true, name);
});
