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

export function runPythonLab(
  code: string,
  lab: PythonLabDefinition,
  onPhase?: (phase: RunnerPhase) => void,
): Promise<PythonRunResult> {
  return new Promise((resolve) => {
    const worker = new Worker("/python-worker.mjs", { type: "module", name: "briliantai-python-sandbox" });
    const id = crypto.randomUUID();
    let executionTimer: ReturnType<typeof setTimeout> | null = null;
    const bootTimer = setTimeout(() => finish({ passed: false, tests: [], output: "", error: "Python runtime tải quá lâu. Hãy kiểm tra mạng và thử lại." }), BOOT_TIMEOUT_MS);

    function finish(result: PythonRunResult) {
      clearTimeout(bootTimer);
      if (executionTimer) clearTimeout(executionTimer);
      worker.terminate();
      resolve(result);
    }

    onPhase?.("booting");
    worker.onmessage = (event: MessageEvent) => {
      const message = event.data ?? {};
      if (message.type === "ready") {
        worker.postMessage({ id, code, lab });
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
