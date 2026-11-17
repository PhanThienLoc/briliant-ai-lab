export type PythonTestResult = { name: string; passed: boolean };

export type PythonRunResult = {
  passed: boolean;
  tests: PythonTestResult[];
  output: string;
  error: string | null;
};

export type PythonLabDefinition = {
  tests: Array<{
    name: string;
    setup?: string;
    expression: string;
    expected: unknown;
    tolerance?: number;
  }>;
};

export type RunnerPhase = "booting" | "executing";

const BOOT_TIMEOUT_MS = 30_000;
const EXECUTION_TIMEOUT_MS = 2_500;

function createRunId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = crypto.getRandomValues(new Uint32Array(4));
    return `run-${Array.from(bytes, (value) => value.toString(36)).join("-")}`;
  }
  return `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function runPythonLab(
  code: string,
  lab: PythonLabDefinition,
  onPhase?: (phase: RunnerPhase) => void,
): Promise<PythonRunResult> {
  return new Promise((resolve) => {
    const id = createRunId();
    let worker: Worker;
    try {
      worker = new Worker("/python-worker.mjs", { type: "module", name: "briliantai-python-sandbox" });
    } catch {
      resolve({ passed: false, tests: [], output: "", error: "Không thể mở Python worker trên trình duyệt này." });
      return;
    }
    let settled = false;
    let executionTimer: ReturnType<typeof setTimeout> | null = null;
    const bootTimer = setTimeout(() => finish({ passed: false, tests: [], output: "", error: "Python runtime tải quá lâu. Hãy kiểm tra mạng và thử lại." }), BOOT_TIMEOUT_MS);

    function finish(result: PythonRunResult) {
      if (settled) return;
      settled = true;
      clearTimeout(bootTimer);
      if (executionTimer) clearTimeout(executionTimer);
      try {
        worker.terminate();
      } catch {
        // A worker that already failed may also reject termination.
      }
      resolve(result);
    }

    onPhase?.("booting");
    worker.onmessage = (event: MessageEvent) => {
      const message = event.data ?? {};
      if (message.type === "ready") {
        try {
          worker.postMessage({ id, code, lab });
        } catch {
          finish({ passed: false, tests: [], output: "", error: "Không thể gửi bài code vào Python worker." });
        }
        return;
      }
      if (message.type === "executing" && message.id === id) {
        onPhase?.("executing");
        executionTimer = setTimeout(() => finish({ passed: false, tests: [], output: "", error: "TimeLimitExceeded: code vượt quá 2,5 giây và sandbox đã bị hủy." }), EXECUTION_TIMEOUT_MS);
        return;
      }
      if (message.type === "boot-error") {
        finish({ passed: false, tests: [], output: "", error: `Không thể khởi tạo Python: ${message.error}` });
        return;
      }
      if (message.type === "result" && message.id === id) finish(message.result as PythonRunResult);
    };
    worker.onerror = () => finish({ passed: false, tests: [], output: "", error: "Python worker gặp lỗi và đã được đóng an toàn." });
  });
}
