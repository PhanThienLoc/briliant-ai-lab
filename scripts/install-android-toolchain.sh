#!/usr/bin/env bash
set -euo pipefail
umask 022

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
readonly TOOLCHAIN_ROOT="/workspace/.toolchains"
readonly LOCK_FILE="$SCRIPT_DIR/android-toolchain.lock.json"

for dependency in curl python3 tar unzip sha256sum sha1sum; do
  command -v "$dependency" >/dev/null || { echo "Required host utility missing: $dependency" >&2; exit 69; }
done
[[ -r "$LOCK_FILE" ]] || { echo "Toolchain lock file missing: $LOCK_FILE" >&2; exit 66; }

lock_value() {
  python3 - "$LOCK_FILE" "$1" <<'PY'
import json, sys
value = json.load(open(sys.argv[1], encoding="utf-8"))
for key in sys.argv[2].split("."):
    value = value[key]
print(value)
PY
}

readonly TEMURIN_VERSION="$(lock_value temurin.version)"
readonly TEMURIN_URL="$(lock_value temurin.url)"
readonly TEMURIN_SHA256="$(lock_value temurin.sha256)"
readonly RUSTUP_VERSION="$(lock_value rustup.version)"
readonly RUSTUP_URL="$(lock_value rustup.url)"
readonly RUSTUP_SHA256="$(lock_value rustup.sha256)"
readonly RUST_VERSION="$(lock_value rust.version)"
readonly RUST_TARGET="$(lock_value rust.target)"
readonly RUST_COMPONENT="$(lock_value rust.component)"
readonly RUST_PROFILE="$(lock_value rust.profile)"
readonly CMDLINE_VERSION="$(lock_value android_cmdline_tools.revision)"
readonly CMDLINE_URL="$(lock_value android_cmdline_tools.url)"
readonly CMDLINE_SHA1="$(lock_value android_cmdline_tools.sha1)"
readonly NDK_VERSION="$(lock_value ndk.revision)"
readonly NDK_PACKAGE="$(lock_value ndk.package)"
readonly NDK_SHA1="$(lock_value ndk.sha1)"
readonly NDK_URL="$(lock_value ndk.url)"
readonly NDK_INSTALLED_REVISION="$(lock_value ndk.installed_revision)"
readonly REPOSITORY_URL="$(lock_value android_repository_metadata)"
readonly ANDROID_PLATFORM_PACKAGE="$(lock_value android_platform.package)"
readonly ANDROID_PLATFORM_VERSION="$(lock_value android_platform.revision)"
readonly ANDROID_PLATFORM_PACKAGE_REVISION="$(lock_value android_platform.package_revision)"
readonly ANDROID_BUILD_TOOLS_PACKAGE="$(lock_value android_build_tools.package)"
readonly ANDROID_BUILD_TOOLS_VERSION="$(lock_value android_build_tools.revision)"
readonly SDK_ROOT="$TOOLCHAIN_ROOT/android-sdk"
readonly JDK_HOME="$TOOLCHAIN_ROOT/jdk/temurin-$TEMURIN_VERSION"
readonly CARGO_HOME="$TOOLCHAIN_ROOT/cargo"
readonly RUSTUP_HOME="$TOOLCHAIN_ROOT/rustup"
readonly ANDROID_USER_HOME="$TOOLCHAIN_ROOT/android-user"
readonly ANDROID_CLI_BIN="$SDK_ROOT/cmdline-tools/$CMDLINE_VERSION/bin/android"

mkdir -p "$TOOLCHAIN_ROOT" "$TOOLCHAIN_ROOT/downloads" "$TOOLCHAIN_ROOT/jdk" "$CARGO_HOME" "$RUSTUP_HOME" "$SDK_ROOT"
export RUSTUP_HOME CARGO_HOME
export JAVA_HOME="$JDK_HOME" ANDROID_HOME="$SDK_ROOT" ANDROID_SDK_ROOT="$SDK_ROOT"
export ANDROID_USER_HOME ANDROID_CLI_BIN
export PATH="$JAVA_HOME/bin:$CARGO_HOME/bin:$SDK_ROOT/cmdline-tools/$CMDLINE_VERSION/bin:$PATH"
mkdir -p "$ANDROID_USER_HOME"
readonly DOWNLOADS="$TOOLCHAIN_ROOT/downloads"

download() {
  local url="$1" destination="$2"
  curl --fail --location --retry 3 --retry-delay 2 --output "$destination.part" "$url"
  mv -- "$destination.part" "$destination"
}

verify_sha256() {
  local file="$1" expected="$2"
  printf '%s  %s\n' "$expected" "$file" | sha256sum --check --status || {
    echo "SHA-256 verification failed: $file" >&2
    rm -f -- "$file"
    exit 65
  }
}

verify_sha1() {
  local file="$1" expected="$2"
  printf '%s  %s\n' "$expected" "$file" | sha1sum --check --status || {
    echo "SHA-1 verification failed: $file" >&2
    rm -f -- "$file"
    exit 65
  }
}

verify_android_metadata() {
  local metadata="$DOWNLOADS/repository2-3.xml"
  download "$REPOSITORY_URL" "$metadata"
  python3 - "$metadata" "$LOCK_FILE" <<'PY'
import json, sys, xml.etree.ElementTree as ET
metadata_path, lock_path = sys.argv[1:]
lock = json.load(open(lock_path, encoding="utf-8"))
root = ET.parse(metadata_path).getroot()
packages = {p.get("path"): p for p in root.iter() if p.tag.endswith("remotePackage")}
for key in ("android_cmdline_tools", "android_platform", "android_build_tools", "ndk"):
    expected = lock[key]
    package = packages.get(expected["package"])
    if package is None:
        raise SystemExit(f"Official Android metadata lacks package {expected['package']}")
    api_level = next((x.text for x in package.iter() if x.tag.endswith("api-level")), None)
    revision = package.find("revision")
    parts = [x.text or "0" for x in revision if x.tag.endswith(("major", "minor", "micro"))]
    actual_revision = api_level or ".".join(parts)
    if actual_revision != expected["revision"]:
        raise SystemExit(f"Android metadata revision mismatch for {expected['package']}: {actual_revision}")
    expected_package_revision = expected.get("package_revision")
    if expected_package_revision is not None and ".".join(parts) != expected_package_revision:
        raise SystemExit(f"Android metadata package revision mismatch for {expected['package']}: {'.'.join(parts)}")
    if expected.get("extension_level") is not None:
        extension = next((x.text for x in package.iter() if x.tag.endswith("extension-level")), None)
        if extension != expected["extension_level"]:
            raise SystemExit(f"Android metadata extension level mismatch for {expected['package']}: {extension}")
    found = []
    for archive in package.iter():
        if not archive.tag.endswith("archive"):
            continue
        complete = next((x for x in archive if x.tag.endswith("complete")), None)
        if complete is None:
            continue
        url = next((x.text for x in complete if x.tag.endswith("url")), None)
        checksum = next((x for x in complete if x.tag.endswith("checksum")), None)
        size = next((x.text for x in complete if x.tag.endswith("size")), None)
        if checksum is not None:
            found.append((url, checksum.get("type"), checksum.text, size))
    url = expected["url"].rsplit("/", 1)[-1]
    checksum_key = "sha1"
    if not any(candidate == (url, checksum_key, expected[checksum_key], str(expected["size"])) for candidate in found):
        raise SystemExit(f"Official Android metadata checksum/URL/size mismatch for {expected['package']}")
print("Official Android repository metadata matches the pinned command-line, platform, Build Tools, and NDK packages.")
PY
}

install_temurin() {
  if [[ -x "$JDK_HOME/bin/java" && -x "$JDK_HOME/bin/javac" ]]; then
    return
  fi
  local archive="$DOWNLOADS/temurin-jdk-21.0.13+9.tar.gz" checksum="$DOWNLOADS/temurin-jdk-21.0.13+9.sha256" stage="$TOOLCHAIN_ROOT/.jdk-stage.$$"
  download "$TEMURIN_URL" "$archive"
  download "$(lock_value temurin.checksum_url)" "$checksum"
  verify_sha256 "$archive" "$TEMURIN_SHA256"
  [[ "$(awk '{print $1}' "$checksum")" == "$TEMURIN_SHA256" ]] || { echo "Official Temurin checksum metadata mismatch" >&2; exit 65; }
  rm -rf -- "$stage"
  mkdir -p "$stage"
  tar -xzf "$archive" -C "$stage"
  local extracted
  extracted="$(find "$stage" -mindepth 3 -maxdepth 3 -type f -path '*/bin/java' -print -quit | xargs -r dirname | xargs -r dirname)"
  [[ -n "$extracted" && -x "$extracted/bin/javac" ]] || { echo "Temurin archive did not contain a full JDK" >&2; exit 65; }
  [[ "$(grep -E '^IMPLEMENTOR=' "$extracted/release" | cut -d= -f2- | tr -d '"')" == "Eclipse Adoptium" ]] || { echo "JDK implementor mismatch" >&2; exit 65; }
  mv -- "$extracted" "$JDK_HOME"
  rm -rf -- "$stage"
}

install_rust() {
  if [[ -x "$CARGO_HOME/bin/rustup" ]] && "$CARGO_HOME/bin/rustup" --version | grep -Fq 'rustup 1.29.3'; then
    :
  else
    local archive="$DOWNLOADS/rustup-init-1.29.3" checksum="$DOWNLOADS/rustup-init-1.29.3.sha256"
    download "$RUSTUP_URL" "$archive"
    download "$(lock_value rustup.checksum_url)" "$checksum"
    verify_sha256 "$archive" "$RUSTUP_SHA256"
    local published
    published="$(awk '{print $1}' "$checksum")"
    [[ "$published" == "$RUSTUP_SHA256" ]] || { echo "Official rustup checksum metadata mismatch" >&2; exit 65; }
    chmod 0755 "$archive"
    env RUSTUP_HOME="$RUSTUP_HOME" CARGO_HOME="$CARGO_HOME" "$archive" -y --no-modify-path --default-toolchain none --profile minimal
  fi
  export RUSTUP_HOME CARGO_HOME
  export PATH="$CARGO_HOME/bin:$PATH"
  rustup toolchain install "$RUST_VERSION" --profile "$RUST_PROFILE" --component "$RUST_COMPONENT" --target "$RUST_TARGET" --no-self-update
  rustup run "$RUST_VERSION" rustc --version | grep -Fq "rustc $RUST_VERSION" || { echo "Rust compiler version mismatch" >&2; exit 65; }
  rustup run "$RUST_VERSION" cargo --version | grep -Fq "cargo $RUST_VERSION" || { echo "Cargo version mismatch" >&2; exit 65; }
  rustup target list --installed --toolchain "$RUST_VERSION" | grep -Fxq "$RUST_TARGET" || { echo "Android ARM64 Rust target missing" >&2; exit 65; }
  rustup component list --toolchain "$RUST_VERSION" --installed | grep -Fxq "$RUST_COMPONENT-x86_64-unknown-linux-gnu" || { echo "rustfmt component missing for Rust $RUST_VERSION" >&2; exit 65; }
}

install_cmdline_tools() {
  local target="$SDK_ROOT/cmdline-tools/$CMDLINE_VERSION"
  if [[ -x "$target/bin/sdkmanager" && -f "$target/source.properties" ]] \
    && grep -Fxq "Pkg.Revision=$CMDLINE_VERSION" "$target/source.properties" \
    && grep -Fxq "Pkg.Path=cmdline-tools;$CMDLINE_VERSION" "$target/source.properties"; then
    return
  fi
  local archive="$DOWNLOADS/commandlinetools-linux-23.0.zip" stage="$TOOLCHAIN_ROOT/.cmdline-stage.$$"
  download "$CMDLINE_URL" "$archive"
  verify_sha1 "$archive" "$CMDLINE_SHA1"
  rm -rf -- "$stage"
  mkdir -p "$stage"
  unzip -q "$archive" -d "$stage"
  [[ -x "$stage/cmdline-tools/bin/sdkmanager" ]] || { echo "Android command-line tools archive layout mismatch" >&2; exit 65; }
  mkdir -p "$SDK_ROOT/cmdline-tools"
  rm -rf -- "$target"
  mv -- "$stage/cmdline-tools" "$target"
  rm -rf -- "$stage"
  grep -Fxq "Pkg.Revision=$CMDLINE_VERSION" "$target/source.properties" || { echo "Android command-line tools version mismatch" >&2; exit 65; }
  grep -Fxq "Pkg.Path=cmdline-tools;$CMDLINE_VERSION" "$target/source.properties" || { echo "Android command-line tools package ID mismatch" >&2; exit 65; }
}

install_ndk() {
  local sdkmanager="$SDK_ROOT/cmdline-tools/$CMDLINE_VERSION/bin/sdkmanager"
  local android_cli="$SDK_ROOT/cmdline-tools/$CMDLINE_VERSION/bin/android"
  local ndk_home="$SDK_ROOT/ndk/$NDK_VERSION"
  [[ -x "$sdkmanager" ]] || { echo "sdkmanager is missing from Android command-line tools $CMDLINE_VERSION" >&2; exit 65; }
  if [[ -f "$ndk_home/source.properties" ]] \
    && grep -Fxq "Pkg.Revision = $NDK_INSTALLED_REVISION" "$ndk_home/source.properties" \
    && grep -Fxq "Pkg.BaseRevision = $NDK_VERSION" "$ndk_home/source.properties"; then
    return
  fi
  export ANDROID_HOME="$SDK_ROOT" ANDROID_SDK_ROOT="$SDK_ROOT"
  "$android_cli" sdk --sdk="$SDK_ROOT" install "$NDK_PACKAGE"
  [[ -f "$ndk_home/source.properties" ]] || { echo "SDK manager did not install NDK at $ndk_home" >&2; exit 65; }
  grep -Fxq "Pkg.Revision = $NDK_INSTALLED_REVISION" "$ndk_home/source.properties" || { echo "Installed NDK revision mismatch" >&2; exit 65; }
  grep -Fxq "Pkg.BaseRevision = $NDK_VERSION" "$ndk_home/source.properties" || { echo "Installed NDK base revision mismatch" >&2; exit 65; }
}

install_android_packages() {
  local android_cli="$SDK_ROOT/cmdline-tools/$CMDLINE_VERSION/bin/android"
  local package
  for package in "$ANDROID_PLATFORM_PACKAGE" "$ANDROID_BUILD_TOOLS_PACKAGE"; do
    "$android_cli" sdk --sdk="$SDK_ROOT" install "$package"
  done
  local platform_properties="$SDK_ROOT/platforms/android-$ANDROID_PLATFORM_VERSION/source.properties"
  local build_tools_properties="$SDK_ROOT/build-tools/$ANDROID_BUILD_TOOLS_VERSION/source.properties"
  [[ -f "$platform_properties" ]] || { echo "Android platform $ANDROID_PLATFORM_VERSION was not installed" >&2; exit 65; }
  grep -Fxq "AndroidVersion.ApiLevel=$ANDROID_PLATFORM_VERSION" "$platform_properties" || { echo "Android platform API level mismatch" >&2; exit 65; }
  grep -Fxq "Pkg.Revision=$ANDROID_PLATFORM_PACKAGE_REVISION" "$platform_properties" || { echo "Android platform package revision mismatch" >&2; exit 65; }
  [[ -f "$build_tools_properties" ]] || { echo "Android Build Tools $ANDROID_BUILD_TOOLS_VERSION were not installed" >&2; exit 65; }
  grep -Fxq "Pkg.Revision=$ANDROID_BUILD_TOOLS_VERSION" "$build_tools_properties" || { echo "Android Build Tools revision mismatch" >&2; exit 65; }
}

write_environment() {
  cat > "$TOOLCHAIN_ROOT/env.sh" <<EOF
# Generated by scripts/install-android-toolchain.sh. Source this file from your shell.
export BRILLIANTAI_TOOLCHAIN_ROOT="$TOOLCHAIN_ROOT"
export JAVA_HOME="$JDK_HOME"
export RUSTUP_HOME="$RUSTUP_HOME"
export CARGO_HOME="$CARGO_HOME"
export ANDROID_HOME="$SDK_ROOT"
export ANDROID_SDK_ROOT="$SDK_ROOT"
export ANDROID_NDK_HOME="$SDK_ROOT/ndk/$NDK_VERSION"
export ANDROID_USER_HOME="$ANDROID_USER_HOME"
export ANDROID_CLI_BIN="$ANDROID_CLI_BIN"
export GRADLE_USER_HOME="$TOOLCHAIN_ROOT/gradle"
export NPM_CONFIG_CACHE="$TOOLCHAIN_ROOT/npm-cache"
export PATH="\$JAVA_HOME/bin:\$CARGO_HOME/bin:\$ANDROID_HOME/cmdline-tools/$CMDLINE_VERSION/bin:\$ANDROID_HOME/platform-tools:\$PATH"
EOF
}

verify_android_metadata
install_temurin
install_rust
install_cmdline_tools
install_ndk
install_android_packages
write_environment

bash -c 'source "$1"; [[ "$JAVA_HOME" == "$2" && "$ANDROID_HOME" == "$3" && "$ANDROID_NDK_HOME" == "$4" ]]' \
  -- "$TOOLCHAIN_ROOT/env.sh" "$JDK_HOME" "$SDK_ROOT" "$SDK_ROOT/ndk/$NDK_VERSION"
export JAVA_HOME="$JDK_HOME"
export ANDROID_HOME="$SDK_ROOT" ANDROID_SDK_ROOT="$SDK_ROOT"
export ANDROID_NDK_HOME="$SDK_ROOT/ndk/$NDK_VERSION"
export PATH="$JAVA_HOME/bin:$CARGO_HOME/bin:$ANDROID_HOME/cmdline-tools/$CMDLINE_VERSION/bin:$PATH"
[[ "$(java -version 2>&1 | head -n 1)" == *"21.0.13"* ]] || { echo "Java version mismatch" >&2; exit 65; }
[[ "$(javac -version 2>&1)" == "javac 21.0.13" ]] || { echo "javac version mismatch" >&2; exit 65; }
[[ "$(rustup --version | head -n 1)" == *"rustup 1.29.3"* ]] || { echo "rustup version mismatch" >&2; exit 65; }
[[ "$(rustc --version)" == "rustc $RUST_VERSION "* ]] || { echo "rustc version mismatch: $(rustc --version)" >&2; exit 65; }
[[ "$(cargo --version)" == "cargo $RUST_VERSION "* ]] || { echo "cargo version mismatch: $(cargo --version)" >&2; exit 65; }
grep -Fxq "Pkg.Revision=$CMDLINE_VERSION" "$ANDROID_HOME/cmdline-tools/$CMDLINE_VERSION/source.properties" || { echo "Android command-line tools version mismatch" >&2; exit 65; }
grep -Fxq "IMPLEMENTOR=\"Eclipse Adoptium\"" "$JAVA_HOME/release" || { echo "Temurin JDK vendor mismatch" >&2; exit 65; }
grep -Fxq "Pkg.Revision = $NDK_INSTALLED_REVISION" "$ANDROID_NDK_HOME/source.properties" || { echo "NDK revision mismatch" >&2; exit 65; }
grep -Fxq "Pkg.BaseRevision = $NDK_VERSION" "$ANDROID_NDK_HOME/source.properties" || { echo "NDK base revision mismatch" >&2; exit 65; }
test -x "$ANDROID_NDK_HOME/toolchains/llvm/prebuilt/linux-x86_64/bin/aarch64-linux-android24-clang" || { echo "NDK ARM64 compiler is missing" >&2; exit 65; }
echo "Android toolchain installed and verified under $TOOLCHAIN_ROOT"
echo "JDK: $JAVA_HOME"
echo "Rust target: $RUST_TARGET"
echo "Android SDK: $ANDROID_HOME"
echo "Android NDK: $ANDROID_NDK_HOME"
