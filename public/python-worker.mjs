import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v314.0.6/full/pyodide.mjs";

const MAX_CODE_LENGTH = 5000;
const MAX_OUTPUT_LENGTH = 4000;
const pyodideReady = loadPyodide({
  indexURL: "https://cdn.jsdelivr.net/pyodide/v314.0.6/full/",
});

const runner = String.raw`
import ast
import contextlib
import io
import json
import math
import traceback

payload = json.loads(__runner_payload)
source = payload["code"]
lab = payload["lab"]

BLOCKED_NODES = (
    ast.Import, ast.ImportFrom, ast.Global, ast.Nonlocal, ast.ClassDef,
    ast.AsyncFunctionDef, ast.Await, ast.Yield, ast.YieldFrom,
)
BLOCKED_NAMES = {
    "open", "eval", "exec", "compile", "__import__", "input", "help",
    "globals", "locals", "vars", "dir", "getattr", "setattr", "delattr",
    "breakpoint", "memoryview", "exit", "quit",
}
MAX_RANGE_LENGTH = 100_000
MAX_LITERAL_LENGTH = 10_000
MAX_POWER = 10_000

class SafetyVisitor(ast.NodeVisitor):
    def generic_visit(self, node):
        if isinstance(node, BLOCKED_NODES):
            raise ValueError(f"Cấu trúc {type(node).__name__} không được phép trong sandbox")
        super().generic_visit(node)

    def visit_Name(self, node):
        if node.id in BLOCKED_NAMES or node.id.startswith("__"):
            raise ValueError(f"Tên '{node.id}' không được phép trong sandbox")
        self.generic_visit(node)

    def visit_Attribute(self, node):
        if node.attr.startswith("_"):
            raise ValueError("Không được truy cập thuộc tính private/dunder")
        self.generic_visit(node)

    def visit_Constant(self, node):
        if isinstance(node.value, (str, bytes)) and len(node.value) > MAX_LITERAL_LENGTH:
            raise ValueError("Literal quá lớn cho sandbox")
        self.generic_visit(node)

    def visit_BinOp(self, node):
        if isinstance(node.op, ast.Pow) and isinstance(node.right, ast.Constant):
            if isinstance(node.right.value, (int, float)) and abs(node.right.value) > MAX_POWER:
                raise ValueError("Số mũ quá lớn cho sandbox")
        self.generic_visit(node)

def safe_range(*args):
    value = range(*args)
    if len(value) > MAX_RANGE_LENGTH:
        raise ValueError("range vượt quá 100.000 phần tử")
    return value

def safe_pow(base, exponent, modulus=None):
    if isinstance(exponent, (int, float)) and abs(exponent) > MAX_POWER:
        raise ValueError("Số mũ quá lớn cho sandbox")
    return pow(base, exponent) if modulus is None else pow(base, exponent, modulus)

class CappedOutput(io.StringIO):
    def __init__(self, limit):
        super().__init__()
        self.limit = limit

    def write(self, value):
        remaining = max(0, self.limit - self.tell())
        if remaining:
            super().write(value[:remaining])
        return len(value)

SAFE_BUILTINS = {
    "abs": abs, "all": all, "any": any, "bool": bool, "dict": dict,
    "enumerate": enumerate, "filter": filter, "float": float, "int": int,
    "isinstance": isinstance, "len": len, "list": list, "map": map,
    "max": max, "min": min, "pow": safe_pow, "print": print,
    "range": safe_range, "reversed": reversed,
    "round": round, "set": set, "sorted": sorted, "str": str, "sum": sum,
    "tuple": tuple, "zip": zip, "Exception": Exception, "ValueError": ValueError,
    "TypeError": TypeError, "ZeroDivisionError": ZeroDivisionError,
}

def comparable(value):
    if hasattr(value, "tolist"):
        value = value.tolist()
    if isinstance(value, tuple):
        return [comparable(item) for item in value]
    if isinstance(value, list):
        return [comparable(item) for item in value]
    if isinstance(value, dict):
        return {str(key): comparable(item) for key, item in value.items()}
    return value

def close_enough(actual, expected, tolerance=1e-7):
    actual = comparable(actual)
    expected = comparable(expected)
    if isinstance(actual, (int, float)) and isinstance(expected, (int, float)):
        return math.isclose(float(actual), float(expected), rel_tol=tolerance, abs_tol=tolerance)
    if isinstance(actual, list) and isinstance(expected, list):
        return len(actual) == len(expected) and all(close_enough(a, e, tolerance) for a, e in zip(actual, expected))
    if isinstance(actual, dict) and isinstance(expected, dict):
        return actual.keys() == expected.keys() and all(close_enough(actual[key], expected[key], tolerance) for key in actual)
    return actual == expected

result = {"passed": False, "tests": [], "output": "", "error": None}
output = CappedOutput(4000)

try:
    tree = ast.parse(source, filename="learner.py", mode="exec")
    SafetyVisitor().visit(tree)
    environment = {"__builtins__": SAFE_BUILTINS}
    with contextlib.redirect_stdout(output):
        exec(compile(tree, "learner.py", "exec"), environment, environment)
        for test in lab["tests"]:
            if test.get("setup"):
                exec(compile(test["setup"], "hidden_setup.py", "exec"), environment, environment)
            actual = eval(compile(test["expression"], "hidden_test.py", "eval"), environment, environment)
            passed = close_enough(actual, test["expected"], test.get("tolerance", 1e-7))
            result["tests"].append({"name": test["name"], "passed": passed})
    result["passed"] = len(result["tests"]) > 0 and all(test["passed"] for test in result["tests"])
except SyntaxError as error:
    result["error"] = f"SyntaxError dòng {error.lineno}: {error.msg}"
except ValueError as error:
    result["error"] = f"SafetyError: {error}"
except Exception as error:
    result["error"] = f"{type(error).__name__}: {error}"

result["output"] = output.getvalue()[:4000]
json.dumps(result, ensure_ascii=False)
`;

self.onmessage = async (event) => {
  const { id, code, lab } = event.data ?? {};
  if (typeof code !== "string" || code.length > MAX_CODE_LENGTH) {
    self.postMessage({ id, type: "result", result: { passed: false, tests: [], output: "", error: "Code phải ngắn hơn 5.000 ký tự." } });
    return;
  }

  try {
    const pyodide = await pyodideReady;
    self.fetch = () => Promise.reject(new Error("Network access is disabled inside the Python sandbox."));
    self.postMessage({ id, type: "executing" });
    const payload = JSON.stringify({ code, lab });
    pyodide.globals.set("__runner_payload", payload);
    const serialized = await pyodide.runPythonAsync(runner);
    pyodide.globals.delete("__runner_payload");
    const result = JSON.parse(serialized);
    result.output = String(result.output ?? "").slice(0, MAX_OUTPUT_LENGTH);
    self.postMessage({ id, type: "result", result });
  } catch (error) {
    self.postMessage({ id, type: "result", result: { passed: false, tests: [], output: "", error: `RuntimeError: ${error instanceof Error ? error.message : String(error)}` } });
  }
};

pyodideReady.then(() => self.postMessage({ type: "ready" })).catch((error) => {
  self.postMessage({ type: "boot-error", error: error instanceof Error ? error.message : String(error) });
});
