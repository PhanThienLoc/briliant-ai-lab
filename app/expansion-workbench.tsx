"use client";

import "./track-studio.css";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { expansionLabs, expansionTracks, getExpansionLab, isExpansionLabId, outgoingPrerequisiteEdges, trackLabs, type ExpansionEdgeId, type ExpansionLabId, type ExpansionPrerequisiteEdge, type ExpansionTrackId } from "../lib/expansion-catalog";
import { completeExpansionLab, dueExpansionReviews, emptyExpansionProgress, EXPANSION_PROGRESS_KEY, isExpansionLabUnlocked, LEGACY_EXPANSION_PROGRESS_KEYS, masteredExpansionLabs, normalizeExpansionProgress, recordExpansionAttempt, submitExpansionReview, submitPrerequisiteEdge, type ExpansionProgress } from "../lib/expansion-progress";
import { customersTable, executeSelect, gradeHavingQuery, gradeOuterJoinQuery, gradeSouthOrderQuery, gradeSubqueryQuery, gradeTierRevenueQuery, ordersTable } from "../lib/sql-sandbox.mjs";
import { confusionAtThreshold, knnPoints, knnPrediction, knnQuery, leakageRisk, learningCurve, splitCounts, thresholdCases } from "../lib/ml-labs.mjs";
import { attentionSnapshot, denseForward, evaluateAiCandidates, gradientStep, tokenizeForEmbedding } from "../lib/r4-labs.mjs";
import { advanceBfsPrediction, gradeBfsBehavior, passesQueueBehaviorChallenge, simulateQueue } from "../lib/structure-grader.mjs";
import { recordLearningEvent } from "../lib/local-learning-log";

type Judge = (passed: boolean, hintLevel?: number) => void;

function readProgress(): ExpansionProgress {
  if (typeof window === "undefined") return emptyExpansionProgress;
  try {
    const current = window.localStorage.getItem(EXPANSION_PROGRESS_KEY);
    const legacy = LEGACY_EXPANSION_PROGRESS_KEYS.map((key) => window.localStorage.getItem(key)).find(Boolean);
    return normalizeExpansionProgress(JSON.parse(current ?? legacy ?? "null"));
  } catch { return emptyExpansionProgress; }
}

function LabShell({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  return <section className="expansion-lab"><header><span className="mono-label">{eyebrow}</span><h2>{title}</h2><p>{description}</p></header>{children}</section>;
}

function Feedback({ passed, children }: { passed: boolean; children: ReactNode }) {
  return <p className={passed ? "lab-feedback passed" : "lab-feedback retry"} role="status"><strong>{passed ? "Evidence đạt" : "Chưa đạt"}</strong>{children}</p>;
}

function TruthTableLab({ onJudge }: { onJudge: Judge }) {
  const [p, setP] = useState(true); const [q, setQ] = useState(true); const [operator, setOperator] = useState<"and" | "or" | "implies">("implies"); const [feedback, setFeedback] = useState<boolean | null>(null);
  const evaluate = (left: boolean, right: boolean) => operator === "and" ? left && right : operator === "or" ? left || right : !left || right;
  const rows = [[true, true], [true, false], [false, true], [false, false]] as const;
  const check = () => { const passed = operator === "implies" && p && !q && !evaluate(p, q); setFeedback(passed); onJudge(passed); };
  return <LabShell eyebrow="R1 · LOGIC COUNTEREXAMPLE" title="Khi nào P → Q sai?" description="Đổi P, Q và toán tử để tự tìm phản ví dụ, thay vì học thuộc bảng chân trị.">
    <div className="logic-workspace"><div className="logic-controls"><label><span>Toán tử</span><select value={operator} onChange={(event) => { setOperator(event.target.value as typeof operator); setFeedback(null); }}><option value="and">P AND Q</option><option value="or">P OR Q</option><option value="implies">P → Q</option></select></label><button aria-pressed={p} className={p ? "boolean-toggle true" : "boolean-toggle"} onClick={() => { setP(!p); setFeedback(null); }}><span>P</span><strong>{p ? "TRUE" : "FALSE"}</strong></button><button aria-pressed={q} className={q ? "boolean-toggle true" : "boolean-toggle"} onClick={() => { setQ(!q); setFeedback(null); }}><span>Q</span><strong>{q ? "TRUE" : "FALSE"}</strong></button><output className={evaluate(p, q) ? "logic-output true" : "logic-output false"}>{evaluate(p, q) ? "TRUE" : "FALSE"}</output></div><table className="truth-table"><thead><tr><th>P</th><th>Q</th><th>Kết quả</th></tr></thead><tbody>{rows.map(([left, right]) => <tr className={left === p && right === q ? "active" : ""} key={`${left}-${right}`}><td>{String(left)}</td><td>{String(right)}</td><td>{String(evaluate(left, right))}</td></tr>)}</tbody></table></div>
    <div className="lab-challenge"><div><strong>Thử thách</strong><p>Chọn phép kéo theo và trường hợp duy nhất làm mệnh đề sai.</p></div><button className="primary-action" onClick={check}>Kiểm tra phản ví dụ</button></div>
    {feedback !== null ? <Feedback passed={feedback}>{feedback ? "P đúng nhưng Q sai: lời hứa ‘nếu P thì Q’ bị phá." : "Tìm dòng tiền đề đã xảy ra nhưng kết luận không xảy ra."}</Feedback> : null}
  </LabShell>;
}

function ConditionalProbabilityLab({ onJudge }: { onJudge: Judge }) {
  const [conditionSize, setConditionSize] = useState(40); const [overlap, setOverlap] = useState(12); const [answer, setAnswer] = useState(""); const [feedback, setFeedback] = useState<boolean | null>(null);
  const probability = overlap / conditionSize * 100;
  const check = () => { const passed = conditionSize === 40 && overlap === 12 && Math.abs(Number(answer) - 30) <= .5; setFeedback(passed); onJudge(passed); };
  return <LabShell eyebrow="R1 · CONDITIONAL SAMPLE SPACE" title="Điều kiện mới sẽ đổi mẫu số" description="P(A|B) không hỏi A trên toàn bộ dữ liệu; nó chỉ nhìn vào vùng B đã biết xảy ra.">
    <div className="conditional-visual"><div className="conditional-universe"><span>100 observations</span><i className="condition-set" style={{ width: `${conditionSize}%` }}><b>B · {conditionSize}</b><i className="overlap-set" style={{ width: `${overlap / conditionSize * 100}%` }}><b>A∩B · {overlap}</b></i></i></div><div className="transform-readout"><span>MẪU SỐ<strong>{conditionSize}</strong></span><i>→</i><span>P(A|B)<strong>{probability.toFixed(1)}%</strong></span></div></div>
    <div className="lab-controls two-controls"><label><span>Kích thước B <output>{conditionSize}</output></span><input aria-label="Kích thước B" type="range" min="20" max="80" step="5" value={conditionSize} onChange={(event) => { const next = Number(event.target.value); setConditionSize(next); setOverlap(Math.min(overlap, next)); setFeedback(null); }} /></label><label><span>Giao A∩B <output>{overlap}</output></span><input aria-label="Giao A∩B" type="range" min="1" max={conditionSize} value={overlap} onChange={(event) => { setOverlap(Number(event.target.value)); setFeedback(null); }} /></label></div>
    <div className="lab-challenge bayes-answer"><div><strong>Sample-space challenge</strong><p>Đặt B = 40, A∩B = 12 rồi nhập P(A|B).</p></div><label><span>Đáp án %</span><input inputMode="decimal" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="30" /></label><button className="primary-action" disabled={!answer.trim()} onClick={check}>Kiểm tra mẫu số</button></div>
    {feedback !== null ? <Feedback passed={feedback}>{feedback ? "Đúng: 12/40 = 30%. Điều kiện B đã thu hẹp không gian mẫu." : "Mẫu số phải là số quan sát trong B, không phải toàn bộ 100."}</Feedback> : null}
  </LabShell>;
}

function BayesLab({ onJudge }: { onJudge: Judge }) {
  const [prior, setPrior] = useState(1); const [sensitivity, setSensitivity] = useState(90); const [falsePositive, setFalsePositive] = useState(10); const [answer, setAnswer] = useState(""); const [feedback, setFeedback] = useState<boolean | null>(null);
  const truePositive = prior * sensitivity / 100; const falsePositiveMass = (100 - prior) * falsePositive / 100; const posterior = truePositive / Math.max(.0001, truePositive + falsePositiveMass) * 100;
  const check = () => { const passed = Number.isFinite(Number(answer)) && Math.abs(Number(answer) - posterior) <= 1; setFeedback(passed); onJudge(passed); };
  return <LabShell eyebrow="R1 · BAYES BASE-RATE" title="Một test tốt vẫn có thể tạo nhiều báo động giả" description="Thay prior và chất lượng test để nhìn trực tiếp true-positive mass và false-positive mass.">
    <div className="bayes-population" aria-label={`${truePositive.toFixed(1)} true positive và ${falsePositiveMass.toFixed(1)} false positive`}><div className="bayes-true" style={{ width: `${Math.max(1, truePositive / Math.max(.1, truePositive + falsePositiveMass) * 100)}%` }}><span>TP {truePositive.toFixed(1)}</span></div><div className="bayes-false" style={{ flex: Math.max(.1, falsePositiveMass) }}><span>FP {falsePositiveMass.toFixed(1)}</span></div></div>
    <div className="lab-controls three-controls"><label><span>Prior <output>{prior}%</output></span><input aria-label="Prior" type="range" min="1" max="50" value={prior} onChange={(e) => { setPrior(Number(e.target.value)); setFeedback(null); }} /></label><label><span>Sensitivity <output>{sensitivity}%</output></span><input aria-label="Sensitivity" type="range" min="50" max="99" value={sensitivity} onChange={(e) => { setSensitivity(Number(e.target.value)); setFeedback(null); }} /></label><label><span>False positive <output>{falsePositive}%</output></span><input aria-label="False positive" type="range" min="1" max="40" value={falsePositive} onChange={(e) => { setFalsePositive(Number(e.target.value)); setFeedback(null); }} /></label></div>
    <div className="lab-challenge bayes-answer"><div><strong>Posterior challenge</strong><p>Trong mọi test dương tính, bao nhiêu % thực sự thuộc nhóm bệnh?</p></div><label><span>Đáp án %</span><input inputMode="decimal" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Ví dụ 8.3" /></label><button className="primary-action" disabled={!answer.trim()} onClick={check}>Kiểm tra cập nhật</button></div>
    {feedback !== null ? <Feedback passed={feedback}>{feedback ? `Đúng. Posterior xấp xỉ ${posterior.toFixed(1)}%.` : "Tính TP / (TP + FP), không bỏ false positives khỏi mẫu số."}</Feedback> : null}
  </LabShell>;
}

function VectorMagnitudeLab({ onJudge }: { onJudge: Judge }) {
  const [x, setX] = useState(2); const [y, setY] = useState(2); const [answer, setAnswer] = useState(""); const [feedback, setFeedback] = useState<boolean | null>(null); const magnitude = Math.hypot(x, y);
  const point = { x: 140 + x * 24, y: 140 - y * 24 };
  const check = () => { const passed = x === 3 && y === 4 && Math.abs(Number(answer) - 5) <= .05; setFeedback(passed); onJudge(passed); };
  return <LabShell eyebrow="R1 · VECTOR COMPONENTS" title="Vector giữ hướng và độ lớn cùng lúc" description="Mỗi trục là một thành phần; độ lớn tổng hợp bằng định lý Pythagoras.">
    <div className="transform-workspace"><svg viewBox="0 0 280 220" role="img" aria-label={`Vector ${x}, ${y}`}><path className="transform-grid" d="M10 140H270M140 10V210M44 10V210M68 10V210M92 10V210M116 10V210M164 10V210M188 10V210M212 10V210M236 10V210M260 10V210M10 44H270M10 68H270M10 92H270M10 116H270M10 164H270M10 188H270" /><line className="result-vector" x1="140" y1="140" x2={point.x} y2={point.y} /><circle className="result-vector" cx={point.x} cy={point.y} r="6" /></svg><div className="transform-readout"><span>VECTOR<strong>[{x}, {y}]</strong></span><i>→</i><span>ĐỘ LỚN<strong>{magnitude.toFixed(2)}</strong></span></div></div>
    <div className="lab-controls two-controls"><label><span>x <output>{x}</output></span><input aria-label="x" type="range" min="-4" max="5" value={x} onChange={(e) => { setX(Number(e.target.value)); setFeedback(null); }} /></label><label><span>y <output>{y}</output></span><input aria-label="y" type="range" min="-4" max="5" value={y} onChange={(e) => { setY(Number(e.target.value)); setFeedback(null); }} /></label></div>
    <div className="lab-challenge bayes-answer"><div><strong>3–4–5 challenge</strong><p>Đặt vector thành [3,4] rồi nhập độ lớn.</p></div><label><span>Độ lớn</span><input inputMode="decimal" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="5" /></label><button className="primary-action" disabled={!answer.trim()} onClick={check}>Kiểm tra vector</button></div>
    {feedback !== null ? <Feedback passed={feedback}>{feedback ? "Đúng: √(3² + 4²) = 5." : "Độ lớn là √(x²+y²), không phải x+y."}</Feedback> : null}
  </LabShell>;
}

function LinearTransformLab({ onJudge }: { onJudge: Judge }) {
  const [scaleX, setScaleX] = useState(1); const [scaleY, setScaleY] = useState(1); const [angle, setAngle] = useState(0); const [feedback, setFeedback] = useState<boolean | null>(null);
  const radians = angle * Math.PI / 180; const scaled = { x: 2 * scaleX, y: scaleY }; const transformed = { x: scaled.x * Math.cos(radians) - scaled.y * Math.sin(radians), y: scaled.x * Math.sin(radians) + scaled.y * Math.cos(radians) }; const point = (a: number, b: number) => ({ x: 150 + a * 28, y: 120 - b * 28 }); const result = point(transformed.x, transformed.y);
  const check = () => { const passed = scaleX === 2 && scaleY === 1 && angle === 90; setFeedback(passed); onJudge(passed); };
  return <LabShell eyebrow="R1 · LINEAR TRANSFORM" title="Matrix là cỗ máy làm biến dạng không gian" description="Vector [2,1] được scale theo hai trục rồi quay; hình học và số cập nhật cùng lúc.">
    <div className="transform-workspace"><svg viewBox="0 0 300 240" role="img" aria-label={`Output ${transformed.x.toFixed(1)},${transformed.y.toFixed(1)}`}><path className="transform-grid" d="M10 120H290M150 10V230M38 10V230M66 10V230M94 10V230M122 10V230M178 10V230M206 10V230M234 10V230M262 10V230M10 36H290M10 64H290M10 92H290M10 148H290M10 176H290M10 204H290" /><line className="result-vector" x1="150" y1="120" x2={result.x} y2={result.y} /><circle className="result-vector" cx={result.x} cy={result.y} r="6" /></svg><div className="transform-readout"><span>INPUT<strong>[2, 1]</strong></span><i>→</i><span>OUTPUT<strong>[{transformed.x.toFixed(1)}, {transformed.y.toFixed(1)}]</strong></span></div></div>
    <div className="lab-controls three-controls"><label><span>Scale X <output>{scaleX.toFixed(1)}</output></span><input aria-label="Scale X" type="range" min=".5" max="2.5" step=".5" value={scaleX} onChange={(e) => { setScaleX(Number(e.target.value)); setFeedback(null); }} /></label><label><span>Scale Y <output>{scaleY.toFixed(1)}</output></span><input aria-label="Scale Y" type="range" min=".5" max="2.5" step=".5" value={scaleY} onChange={(e) => { setScaleY(Number(e.target.value)); setFeedback(null); }} /></label><label><span>Rotation <output>{angle}°</output></span><input aria-label="Rotation" type="range" min="0" max="180" step="15" value={angle} onChange={(e) => { setAngle(Number(e.target.value)); setFeedback(null); }} /></label></div>
    <div className="lab-challenge"><div><strong>Thử thách</strong><p>Scale X ×2, giữ Y ×1 rồi quay 90°.</p></div><button className="primary-action" onClick={check}>Xác minh cấu hình</button></div>
    {feedback !== null ? <Feedback passed={feedback}>{feedback ? "[2,1] → [4,1] → [−1,4]." : "Đặt đúng ba tham số; scale xảy ra trước rotation."}</Feedback> : null}
  </LabShell>;
}

function ResultTable({ result, passed, calibration }: { result: ReturnType<typeof executeSelect>; passed: boolean; calibration?: string }) {
  return <div className="sql-result"><header><strong>{result.error ? "Truy vấn chưa chạy được" : `Kết quả · ${result.rows.length} dòng`}</strong>{calibration ? <span>{calibration}</span> : null}{result.plan.map((step) => <span key={step}>{step}</span>)}</header>{result.error ? <Feedback passed={false}>{result.error}</Feedback> : <div className="query-table-scroll" role="region" aria-label="Bảng kết quả truy vấn" tabIndex={0}><table><thead><tr>{result.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{result.rows.map((row, index) => <tr key={index}>{result.columns.map((column) => <td key={column}>{String(row[column])}</td>)}</tr>)}</tbody></table></div>}{!result.error ? <Feedback passed={passed}>{passed ? "Truy vấn cho kết quả đúng trên tất cả bộ dữ liệu kiểm tra." : "Truy vấn chạy được nhưng kết quả chưa đạt yêu cầu trên tất cả bộ dữ liệu. Đối chiếu lại điều kiện, cột trả về và thứ tự."}</Feedback> : null}</div>;
}

function SqlLab({ onJudge }: { onJudge: Judge }) {
  const [query, setQuery] = useState("SELECT id, amount\nFROM orders\nWHERE region = 'south'\nORDER BY amount DESC;"); const [result, setResult] = useState<ReturnType<typeof executeSelect> | null>(null); const [grade, setGrade] = useState({ passed: false, fixturesPassed: 0, fixturesTotal: 3 }); const [hintLevel, setHintLevel] = useState(0);
  const run = () => { const next = executeSelect(query); const nextGrade = gradeSouthOrderQuery(query); setResult(next); setGrade(nextGrade); onJudge(nextGrade.passed, hintLevel); };
  return <LabShell eyebrow="R2 · SELECT-ONLY SQL SANDBOX" title="Truy vấn bằng kết quả, không bằng trí nhớ cú pháp" description="Parser thực thi SQL đọc dữ liệu ngay trong trình duyệt; không có database, file hoặc network.">
    <div className="sql-challenge"><strong>Mục tiêu truy vấn</strong><p>Lấy <code>id, amount</code> của đơn miền <code>south</code> có amount ≥ 180, xếp amount giảm dần.</p></div>
    <div className="sql-layout"><div className="sql-editor"><div><span>orders · {ordersTable.length} rows</span><small>SELECT / WHERE / AND / ORDER BY / LIMIT</small></div><textarea aria-label="SQL query" value={query} onChange={(e) => { setQuery(e.target.value); setResult(null); }} spellCheck={false} rows={8} /><footer><button className="outline-action" disabled={hintLevel >= 2} onClick={() => setHintLevel((value) => Math.min(2, value + 1))}>{hintLevel ? "Mở gợi ý tiếp theo" : "Không nhớ cú pháp?"}</button><button className="primary-action" onClick={run}>Chạy truy vấn</button></footer>{hintLevel ? <aside><strong>Syntax Coach {hintLevel}/2</strong><p>{hintLevel === 1 ? "Bắt đầu từ SELECT id, amount FROM orders; sau đó thêm điều kiện." : "WHERE region = 'south' AND amount >= 180 ORDER BY amount DESC"}</p></aside> : null}</div><div className="sql-data" role="region" aria-label="Bảng mẫu orders" tabIndex={0}><table><thead><tr>{Object.keys(ordersTable[0]).map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{ordersTable.map((row) => <tr key={row.id}>{Object.values(row).map((value, index) => <td key={index}>{value}</td>)}</tr>)}</tbody></table></div></div>
    {result ? <ResultTable result={result} passed={grade.passed} calibration={`${grade.fixturesPassed}/${grade.fixturesTotal} datasets`} /> : null}
  </LabShell>;
}

function JoinAggregateLab({ onJudge }: { onJudge: Judge }) {
  const [query, setQuery] = useState("SELECT customers.tier,\n  COUNT(*) AS order_count,\n  SUM(orders.amount) AS revenue\nFROM orders\nJOIN customers ON orders.customer_id = customers.id\nWHERE orders.status = 'paid'\nORDER BY revenue DESC;"); const [result, setResult] = useState<ReturnType<typeof executeSelect> | null>(null); const [grade, setGrade] = useState({ passed: false, fixturesPassed: 0, fixturesTotal: 3 }); const [hintLevel, setHintLevel] = useState(0);
  const run = () => { const next = executeSelect(query); const nextGrade = gradeTierRevenueQuery(query); setResult(next); setGrade(nextGrade); onJudge(nextGrade.passed, hintLevel); };
  return <LabShell eyebrow="R2 · RELATIONAL SQL SANDBOX" title="Nối rows trước, gom nhóm sau" description="orders là fact; customers cung cấp tier. JOIN làm giàu từng row trước khi GROUP BY và aggregate nén chúng thành metrics.">
    <div className="relation-schema"><article><strong>orders</strong><span>customer_id → customers.id</span><div><b>id</b><b>customer_id</b><b>amount</b><b>status</b></div></article><i>JOIN</i><article><strong>customers</strong><span>dimension</span><div><b>id</b><b>name</b><b>tier</b></div></article></div>
    <div className="sql-challenge"><strong>Mục tiêu truy vấn</strong><p>Với đơn <code>paid</code>, trả về <code>tier, order_count, revenue</code>; một row mỗi tier, revenue giảm dần.</p></div>
    <div className="sql-layout"><div className="sql-editor"><div><span>orders × customers</span><small>JOIN / GROUP BY / COUNT / SUM</small></div><textarea aria-label="JOIN aggregate SQL query" value={query} onChange={(e) => { setQuery(e.target.value); setResult(null); }} spellCheck={false} rows={11} /><footer><button className="outline-action" disabled={hintLevel >= 2} onClick={() => setHintLevel((value) => Math.min(2, value + 1))}>{hintLevel ? "Mở gợi ý tiếp theo" : "Cần syntax coach?"}</button><button className="primary-action" onClick={run}>Chạy truy vấn</button></footer>{hintLevel ? <aside><strong>Syntax Coach {hintLevel}/2</strong><p>{hintLevel === 1 ? "Mỗi tier cần một bucket. Clause nào tạo bucket từ customers.tier?" : "Thêm GROUP BY customers.tier trước ORDER BY. Aggregate được tính riêng trong từng bucket."}</p></aside> : null}</div><div className="sql-data schema-samples" role="region" aria-label="Bảng mẫu customers" tabIndex={0}><strong>customers · sample</strong><table><thead><tr>{Object.keys(customersTable[0]).map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{customersTable.slice(0, 5).map((row) => <tr key={row.id}>{Object.values(row).map((value, index) => <td key={index}>{value}</td>)}</tr>)}</tbody></table></div></div>
    {result ? <ResultTable result={result} passed={grade.passed} calibration={`${grade.fixturesPassed}/${grade.fixturesTotal} datasets`} /> : null}
  </LabShell>;
}

const advancedSqlMissions = [
  {
    id: "having", label: "HAVING", title: "Lọc sau khi aggregate",
    target: <>Với đơn <code>paid</code>, trả về <code>tier, revenue</code> và chỉ giữ tier có revenue ≥ 200.</>,
    starter: "SELECT customers.tier,\n  SUM(orders.amount) AS revenue\nFROM orders\nJOIN customers ON orders.customer_id = customers.id\nWHERE orders.status = 'paid'\nGROUP BY customers.tier\nORDER BY revenue DESC;",
    hint: "Đặt HAVING revenue >= 200 sau GROUP BY và trước ORDER BY.",
    calibrate: gradeHavingQuery,
  },
  {
    id: "subquery", label: "SUBQUERY", title: "Ngưỡng được tính từ chính dữ liệu",
    target: <>Lấy <code>id, amount</code> của các order lớn hơn amount trung bình, xếp giảm dần.</>,
    starter: "SELECT id, amount\nFROM orders\nWHERE amount > 250\nORDER BY amount DESC;",
    hint: "Thay 250 bằng (SELECT AVG(amount) FROM orders). Scalar subquery phải trả đúng một ô.",
    calibrate: gradeSubqueryQuery,
  },
  {
    id: "outer", label: "OUTER JOIN", title: "Giữ cả hai phía không khớp",
    target: <>Trả về <code>order_id, name</code> cho toàn bộ quan hệ; phải thấy order 9 thiếu customer và Mai chưa có order.</>,
    starter: "SELECT orders.id AS order_id, customers.name\nFROM orders\nJOIN customers ON orders.customer_id = customers.id\nORDER BY order_id ASC;",
    hint: "Đổi JOIN thành FULL OUTER JOIN để giữ unmatched rows ở cả orders lẫn customers.",
    calibrate: gradeOuterJoinQuery,
  },
] as const;

function AdvancedSqlLab({ onJudge }: { onJudge: Judge }) {
  const [missionIndex, setMissionIndex] = useState(0);
  const [queries, setQueries] = useState<Record<string, string>>(() => Object.fromEntries(advancedSqlMissions.map((mission) => [mission.id, mission.starter])));
  const [results, setResults] = useState<Partial<Record<string, ReturnType<typeof executeSelect>>>>({});
  const [grades, setGrades] = useState<Record<string, { passed: boolean; fixturesPassed: number; fixturesTotal: number }>>({});
  const [passedMissionIds, setPassedMissionIds] = useState<string[]>([]);
  const [hintedMissionIds, setHintedMissionIds] = useState<string[]>([]);
  const mission = advancedSqlMissions[missionIndex];
  const result = results[mission.id];
  const run = () => {
    const next = executeSelect(queries[mission.id]);
    const calibration = mission.calibrate(queries[mission.id]);
    const passed = calibration.passed;
    const nextPassed = passed && !passedMissionIds.includes(mission.id) ? [...passedMissionIds, mission.id] : passedMissionIds;
    setResults((current) => ({ ...current, [mission.id]: next }));
    setGrades((current) => ({ ...current, [mission.id]: calibration }));
    setPassedMissionIds(nextPassed);
    if (nextPassed.length === advancedSqlMissions.length) onJudge(true, hintedMissionIds.length ? 1 : 0);
    else if (!passed) onJudge(false, hintedMissionIds.includes(mission.id) ? 1 : 0);
  };
  return <LabShell eyebrow="R2 · ADVANCED RELATIONAL BEHAVIOR" title="Ba operator, ba loại câu hỏi khác nhau" description="HAVING lọc group, scalar subquery tạo ngưỡng động, outer join giữ rows không khớp. Lab chỉ đạt khi cả ba behavioral target cùng qua.">
    <nav className="sql-mission-tabs" aria-label="Advanced SQL missions">{advancedSqlMissions.map((item, index) => <button aria-current={index === missionIndex ? "step" : undefined} className={index === missionIndex ? "active" : passedMissionIds.includes(item.id) ? "passed" : ""} key={item.id} onClick={() => setMissionIndex(index)}><span>{passedMissionIds.includes(item.id) ? "✓" : index + 1}</span><strong>{item.label}</strong></button>)}</nav>
    <div className="sql-challenge advanced-target"><span className="mono-label">MISSION {missionIndex + 1}/3</span><strong>{mission.title}</strong><p>{mission.target}</p></div>
    <div className="sql-editor advanced-sql-editor"><div><span>orders × customers</span><small>read-only · local · one scalar subquery level</small></div><textarea aria-label={`${mission.label} SQL query`} value={queries[mission.id]} onChange={(event) => {
      const value = event.target.value;
      setQueries((current) => ({ ...current, [mission.id]: value }));
      setResults((current) => ({ ...current, [mission.id]: undefined }));
    }} spellCheck={false} rows={10} /><footer><button className="outline-action" disabled={hintedMissionIds.includes(mission.id)} onClick={() => setHintedMissionIds((current) => [...current, mission.id])}>Syntax coach</button><button className="primary-action" onClick={run}>Chạy truy vấn</button></footer>{hintedMissionIds.includes(mission.id) ? <aside><strong>Syntax Coach</strong><p>{mission.hint}</p></aside> : null}</div>
    {result ? <ResultTable result={result} passed={grades[mission.id]?.passed ?? false} calibration={`${grades[mission.id]?.fixturesPassed ?? 0}/${grades[mission.id]?.fixturesTotal ?? 3} datasets`} /> : null}
    <footer className="mission-progress"><span>{passedMissionIds.length}/3 target đã đạt</span><div className="progress-track"><i className="indigo" style={{ width: `${passedMissionIds.length / 3 * 100}%` }} /></div></footer>
  </LabShell>;
}

function ComplexityLab({ onJudge }: { onJudge: Judge }) {
  const [n, setN] = useState(64); const [choice, setChoice] = useState<"linear" | "binary" | "quadratic" | null>(null); const [feedback, setFeedback] = useState<boolean | null>(null);
  const values = [{ id: "binary" as const, label: "O(log n)", value: Math.ceil(Math.log2(n)) }, { id: "linear" as const, label: "O(n)", value: n }, { id: "quadratic" as const, label: "O(n²)", value: n * n }]; const maxLog = Math.log10(n * n + 1);
  const check = () => { const passed = n >= 1024 && choice === "binary"; setFeedback(passed); onJudge(passed); };
  return <LabShell eyebrow="R2 · COMPLEXITY RACE" title="Khi n lớn, hình dạng tăng trưởng mới là nút thắt" description="Thanh dùng log-scale để cả ba lớp còn nhìn thấy; con số là operation count thật.">
    <label className="complexity-slider"><span>Input size n <output>{n.toLocaleString("vi-VN")}</output></span><input aria-label="Input size n" type="range" min="16" max="4096" step="16" value={n} onChange={(e) => { setN(Number(e.target.value)); setFeedback(null); }} /></label>
    <div className="complexity-race">{values.map((item) => <button aria-pressed={choice === item.id} className={choice === item.id ? "selected" : ""} key={item.id} onClick={() => { setChoice(item.id); setFeedback(null); }}><span>{item.label}</span><i style={{ "--growth": `${Math.max(4, Math.log10(item.value + 1) / maxLog * 100)}%` } as CSSProperties} /><strong>{item.value.toLocaleString("vi-VN")} ops</strong></button>)}</div>
    <div className="lab-challenge"><div><strong>Scale challenge</strong><p>Kéo n lên ít nhất 1.024 rồi chọn lớp phù hợp cho tìm kiếm trên dữ liệu đã sắp xếp.</p></div><button className="primary-action" disabled={!choice} onClick={check}>Kiểm tra quyết định</button></div>
    {feedback !== null ? <Feedback passed={feedback}>{feedback ? `Binary search cần khoảng ${Math.ceil(Math.log2(n))} lần chia đôi.` : "Dữ liệu đã sắp xếp cho phép loại một nửa mỗi bước."}</Feedback> : null}
  </LabShell>;
}

function QueueBehaviorLab({ onJudge }: { onJudge: Judge }) {
  const [operations, setOperations] = useState<string[]>([]); const [feedback, setFeedback] = useState<boolean | null>(null); const result = simulateQueue(operations);
  const act = (operation: string) => { const next = [...operations, operation]; if (!simulateQueue(next).error && next.length <= 5) setOperations(next); setFeedback(null); };
  const check = () => { const passed = passesQueueBehaviorChallenge(operations); setFeedback(passed); onJudge(passed); };
  return <LabShell eyebrow="R2 · DATA-STRUCTURE BEHAVIOR GRADER" title="FIFO phải đúng qua từng trạng thái" description="Grader replay toàn bộ operation trace và kiểm tra queue/output sau mỗi bước; tên biến hay cách diễn đạt không ảnh hưởng điểm.">
    <div className="queue-lab"><div><span>FRONT</span>{result.queue.length ? result.queue.map((item, index) => <b className={index === 0 ? "head" : ""} key={`${item}-${index}`}>{item}</b>) : <em>queue rỗng</em>}<span>REAR</span></div><aside><span>DEQUEUED OUTPUT</span><strong>{result.output.join(" → ") || "—"}</strong><small>{operations.length}/5 operations</small></aside></div>
    <div className="structure-actions"><div><button onClick={() => act("enqueue:A")}>enqueue A</button><button onClick={() => act("enqueue:B")}>enqueue B</button><button onClick={() => act("enqueue:C")}>enqueue C</button><button onClick={() => act("dequeue")}>dequeue</button></div><button className="text-link" onClick={() => { setOperations([]); setFeedback(null); }}>Reset trace</button></div>
    <div className="operation-trace">{result.states.map((state, index) => <span key={index}><b>{index + 1}</b>{state.operation}<small>[{state.queue.join(", ") || "empty"}]</small></span>)}</div>
    <div className="lab-challenge"><div><strong>Behavioral target</strong><p>Đúng 5 bước để output là A → B và phần tử còn chờ là C.</p></div><button className="primary-action" disabled={operations.length !== 5} onClick={check}>Chấm toàn bộ trace</button></div>
    {feedback !== null ? <Feedback passed={feedback}>{feedback ? "Trace giữ đúng FIFO ở cả năm trạng thái." : "Kết quả cuối hoặc một trạng thái trung gian chưa đúng FIFO."}</Feedback> : null}
  </LabShell>;
}

const bfsGraph: Record<string, string[]> = { A: ["B", "C"], B: ["D", "E"], C: ["F"], D: [], E: [], F: [] };
function BfsLab({ onJudge }: { onJudge: Judge }) {
  const [state, setState] = useState({ queue: ["A"], visited: [] as string[], queueStates: [] as string[][] }); const [prediction, setPrediction] = useState(""); const [message, setMessage] = useState<string | null>(null); const [passed, setPassed] = useState(false);
  const predict = () => {
    const outcome = advanceBfsPrediction(bfsGraph, state, prediction); setPrediction("");
    if (!outcome.correct) { setMessage(`Front hiện tại không phải ${prediction.toUpperCase() || "∅"}. Hãy đọc đầu queue trước.`); onJudge(false); return; }
    setState(outcome.state); setMessage(`${outcome.expected} đúng; grader đã kiểm tra queue sau transition.`);
    if (!outcome.state.queue.length) { const grade = gradeBfsBehavior(bfsGraph, "A", { order: outcome.state.visited, queueStates: outcome.state.queueStates }); setPassed(grade.passed); onJudge(grade.passed); }
  };
  const reset = () => { setState({ queue: ["A"], visited: [], queueStates: [] }); setPrediction(""); setMessage(null); setPassed(false); };
  const positions: Record<string, [number, number]> = { A: [150, 30], B: [85, 90], C: [215, 90], D: [45, 160], E: [120, 160], F: [215, 160] };
  return <LabShell eyebrow="R2 · BFS TRANSITION GRADER" title="Dự đoán front trước khi thuật toán chạy" description="Mỗi lần chỉ được tiến khi dự đoán đúng node sẽ dequeue; cuối cùng grader đối chiếu cả traversal và mọi queue state.">
    <div className="bfs-workspace"><svg viewBox="0 0 300 195" role="img" aria-label="Đồ thị BFS sáu node"><path d="M150 30L85 90M150 30l65 60M85 90l-40 70M85 90l35 70M215 90v70" />{Object.entries(positions).map(([node, [x, y]]) => <g className={state.visited.includes(node) ? "visited" : state.queue[0] === node ? "frontier" : state.queue.includes(node) ? "queued" : ""} key={node}><circle cx={x} cy={y} r="19" /><text x={x} y={y + 4}>{node}</text></g>)}</svg><div className="queue-machine"><span>QUEUE · FRONT → REAR</span><div>{state.queue.length ? state.queue.map((node, index) => <b className={index === 0 ? "head" : ""} key={node}>{node}</b>) : <em>empty</em>}</div><span>VISITED</span><div>{state.visited.length ? state.visited.map((node) => <b key={node}>{node}</b>) : <em>none</em>}</div><label><span>Node nào dequeue tiếp?</span><input value={prediction} maxLength={2} onChange={(e) => { setPrediction(e.target.value); setMessage(null); }} /></label><footer><button className="outline-action" onClick={reset}>Reset</button><button className="primary-action" disabled={!prediction.trim() || passed} onClick={predict}>Commit transition →</button></footer></div></div>
    {message ? <Feedback passed={passed || state.visited.at(-1) === message[0]}>{passed ? "Đúng toàn bộ: A → B → C → D → E → F, mọi queue state đều hợp lệ." : message}</Feedback> : null}
  </LabShell>;
}

function ConfusionThresholdLab({ onJudge }: { onJudge: Judge }) {
  const [threshold, setThreshold] = useState(.7); const [feedback, setFeedback] = useState<boolean | null>(null);
  const matrix = confusionAtThreshold(threshold);
  const check = () => { const passed = Math.abs(threshold - .5) < .001 && matrix.recall >= .8 && matrix.fp <= 2; setFeedback(passed); onJudge(passed); };
  return <LabShell eyebrow="R3 · CLASSIFICATION THRESHOLD" title="Một slider làm cả confusion matrix dịch chuyển" description="Mỗi score vượt threshold trở thành predicted positive. Hãy nhìn trade-off thay vì săn một accuracy duy nhất.">
    <div className="threshold-workspace"><label><span>Decision threshold <output>{threshold.toFixed(2)}</output></span><input aria-label="Decision threshold" type="range" min=".05" max=".95" step=".05" value={threshold} onChange={(event) => { setThreshold(Number(event.target.value)); setFeedback(null); }} /></label><div className="score-strip">{thresholdCases.map((item: { id: string; score: number; actual: number }) => <i className={item.score >= threshold ? item.actual ? "tp" : "fp" : item.actual ? "fn" : "tn"} style={{ "--score": `${item.score * 100}%` } as CSSProperties} key={item.id}><b>{item.id}</b><small>{item.score.toFixed(2)}</small></i>)}<span className="threshold-marker" style={{ left: `${threshold * 100}%` }} /></div><div className="confusion-grid"><article className="tp"><span>TP</span><strong>{matrix.tp}</strong></article><article className="fp"><span>FP</span><strong>{matrix.fp}</strong></article><article className="fn"><span>FN</span><strong>{matrix.fn}</strong></article><article className="tn"><span>TN</span><strong>{matrix.tn}</strong></article></div><div className="metric-pair"><span>Precision <strong>{Math.round(matrix.precision * 100)}%</strong></span><span>Recall <strong>{Math.round(matrix.recall * 100)}%</strong></span></div></div>
    <div className="lab-challenge"><div><strong>Operating-point challenge</strong><p>Đặt threshold = 0.50 để recall đạt ít nhất 80% trong khi false positive không quá 2.</p></div><button className="primary-action" onClick={check}>Chốt threshold</button></div>{feedback !== null ? <Feedback passed={feedback}>{feedback ? "Đúng: ông đã chọn operating point theo chi phí lỗi, không theo thói quen 0.5 mù quáng." : "Theo dõi đồng thời recall và ô FP khi kéo threshold."}</Feedback> : null}
  </LabShell>;
}

function SplitSimulatorLab({ onJudge }: { onJudge: Judge }) {
  const [train, setTrain] = useState(70); const [validation, setValidation] = useState(15); const [role, setRole] = useState<"train" | "validation" | "test" | null>(null); const [feedback, setFeedback] = useState<boolean | null>(null);
  const counts = splitCounts(30, train, validation); const test = 100 - train - validation;
  const check = () => { const passed = train === 60 && validation === 20 && role === "validation"; setFeedback(passed); onJudge(passed); };
  return <LabShell eyebrow="R3 · DATA SPLIT SIMULATOR" title="Ba tập dữ liệu, ba vai trò không thể tráo" description="Tỷ lệ thay đổi ngay trên 30 mẫu; bài kiểm tra buộc chọn đúng tập dùng để tune hyperparameter.">
    <div className="split-workspace"><div className="sample-ribbon">{Array.from({ length: 30 }, (_, index) => <i className={index < counts.train ? "train" : index < counts.train + counts.validation ? "validation" : "test"} key={index} />)}</div><div className="split-legend"><span><i className="train" />Train {counts.train}</span><span><i className="validation" />Validation {counts.validation}</span><span><i className="test" />Test {counts.test}</span></div><div className="lab-controls two-controls"><label><span>Train <output>{train}%</output></span><input aria-label="Train" type="range" min="40" max="80" step="5" value={train} onChange={(event) => { const value = Number(event.target.value); setTrain(value); if (value + validation > 90) setValidation(90 - value); setFeedback(null); }} /></label><label><span>Validation <output>{validation}%</output></span><input aria-label="Validation" type="range" min="10" max={90 - train} step="5" value={validation} onChange={(event) => { setValidation(Number(event.target.value)); setFeedback(null); }} /></label></div><div className="role-choice"><span>Tập nào dùng để chọn hyperparameter?</span>{(["train", "validation", "test"] as const).map((item) => <button aria-pressed={role === item} className={role === item ? "selected" : ""} onClick={() => setRole(item)} key={item}>{item}</button>)}</div></div>
    <div className="lab-challenge"><div><strong>Clean split challenge</strong><p>Tạo split 60/20/20 và chọn đúng tập để tune.</p></div><button className="primary-action" disabled={!role || test < 0} onClick={check}>Kiểm tra protocol</button></div>{feedback !== null ? <Feedback passed={feedback}>{feedback ? "Đúng: train học, validation chọn, test đánh giá một lần ở cuối." : "Đặt 60/20/20 và giữ test ngoài quá trình chọn mô hình."}</Feedback> : null}
  </LabShell>;
}

function LeakageLab({ onJudge }: { onJudge: Judge }) {
  const [splitFirst, setSplitFirst] = useState(false); const [fitOnTrainOnly, setFitOnTrainOnly] = useState(false); const [feedback, setFeedback] = useState<boolean | null>(null); const risk = leakageRisk({ splitFirst, fitOnTrainOnly });
  const check = () => { setFeedback(risk.clean); onJudge(risk.clean); };
  return <LabShell eyebrow="R3 · DATA LEAKAGE FIREWALL" title="Preprocessing cũng học từ dữ liệu" description="Mean, standard deviation hay vocabulary đều là tham số. Nếu chúng nhìn test, evaluation đã bị nhiễm.">
    <div className="leakage-workspace"><div className={risk.clean ? "leakage-pipeline clean" : "leakage-pipeline leaking"}><span>RAW DATA</span><i>→</i><span>{splitFirst ? "SPLIT" : "PREPROCESS"}</span><i>→</i><span>{splitFirst ? "FIT TRAIN" : "SPLIT LATE"}</span><i>→</i><span>VALIDATE / TEST</span></div><div className="leakage-controls"><button aria-pressed={splitFirst} className={splitFirst ? "selected" : ""} onClick={() => { setSplitFirst(!splitFirst); setFeedback(null); }}><strong>1</strong><span>Split trước preprocessing</span></button><button aria-pressed={fitOnTrainOnly} className={fitOnTrainOnly ? "selected" : ""} onClick={() => { setFitOnTrainOnly(!fitOnTrainOnly); setFeedback(null); }}><strong>2</strong><span>Fit scaler chỉ trên train</span></button></div><p className={risk.clean ? "risk-readout clean" : "risk-readout"}>{risk.clean ? "Evaluation firewall sạch" : `Leakage qua ${risk.leaksThrough === "split" ? "việc chia dữ liệu quá muộn" : "tham số preprocessing"}`}</p></div>
    <div className="lab-challenge"><div><strong>Leakage firewall</strong><p>Bật đúng hai hàng rào để validation/test không tham gia vào bất kỳ bước fit nào.</p></div><button className="primary-action" onClick={check}>Audit pipeline</button></div>{feedback !== null ? <Feedback passed={feedback}>{feedback ? "Pipeline sạch: split trước, mọi state chỉ học từ train." : "Một trong hai đường rò vẫn mở."}</Feedback> : null}
  </LabShell>;
}

function KnnScalingLab({ onJudge }: { onJudge: Judge }) {
  const [scaled, setScaled] = useState(false); const [k, setK] = useState(3); const [choice, setChoice] = useState<"A" | "B" | null>(null); const [feedback, setFeedback] = useState<boolean | null>(null); const result = knnPrediction(knnPoints, knnQuery, k, scaled);
  const check = () => { const passed = scaled && k === 3 && choice === result.prediction; setFeedback(passed); onJudge(passed); };
  return <LabShell eyebrow="R3 · KNN DISTANCE" title="Đơn vị đo có thể đổi cả lá phiếu" description="Bật scaling để age và salary đóng góp theo dải tương đối, rồi quan sát ba láng giềng gần nhất đổi màu.">
    <div className="knn-workspace"><svg viewBox="0 0 340 220" role="img" aria-label="KNN feature space">{knnPoints.map((point: { x: number; y: number; label: string }, index: number) => <circle className={`${point.label.toLowerCase()} ${result.neighbors.some((neighbor: { x: number; y: number }) => neighbor.x === point.x && neighbor.y === point.y) ? "neighbor" : ""}`} cx={30 + (point.x - 15) * 5} cy={200 - (point.y - 20) * 2} r="8" key={index} />)}<path className="query-point" d={`M${30 + (knnQuery.x - 15) * 5 - 8} ${200 - (knnQuery.y - 20) * 2}h16m-8-8v16`} /></svg><aside><button aria-pressed={!scaled} className={scaled ? "" : "selected"} onClick={() => { setScaled(false); setFeedback(null); }}>Raw units</button><button aria-pressed={scaled} className={scaled ? "selected" : ""} onClick={() => { setScaled(true); setFeedback(null); }}>Scaled units</button><label><span>k <output>{k}</output></span><input aria-label="k" type="range" min="1" max="5" step="2" value={k} onChange={(event) => { setK(Number(event.target.value)); setFeedback(null); }} /></label><strong>Vote hiện tại: {result.prediction}</strong></aside></div><div className="role-choice"><span>Sau khi scale với k=3, query thuộc lớp nào?</span>{(["A", "B"] as const).map((item) => <button aria-pressed={choice === item} className={choice === item ? "selected" : ""} onClick={() => setChoice(item)} key={item}>{item}</button>)}</div>
    <div className="lab-challenge"><div><strong>Distance challenge</strong><p>Bật scaled units, đặt k=3 và dự đoán theo đúng ba neighbors được viền.</p></div><button className="primary-action" disabled={!choice} onClick={check}>Chấm lá phiếu</button></div>{feedback !== null ? <Feedback passed={feedback}>{feedback ? "Đúng: scaling đã đổi đóng góp của từng trục trước khi tính khoảng cách." : "Đừng đo bằng raw units; đọc lại ba điểm có viền sau scaling."}</Feedback> : null}
  </LabShell>;
}

function RegularizationLab({ onJudge }: { onJudge: Judge }) {
  const [capacity, setCapacity] = useState(8); const [regularization, setRegularization] = useState(0); const [feedback, setFeedback] = useState<boolean | null>(null); const curve = learningCurve(capacity, regularization);
  const check = () => { const passed = capacity === 6 && Math.abs(regularization - .5) < .01 && curve.gap < .12; setFeedback(passed); onJudge(passed); };
  const points = Array.from({ length: 8 }, (_, index) => learningCurve(index + 1, regularization)); const path = (key: "trainLoss" | "validationLoss") => points.map((point, index) => `${index ? "L" : "M"}${25 + index * 40} ${185 - point[key] * 180}`).join(" ");
  return <LabShell eyebrow="R3 · GENERALIZATION PLAYGROUND" title="Train loss thấp nhất chưa chắc là mô hình tốt nhất" description="Tăng capacity làm train loss giảm, nhưng validation loss có thể quay đầu; regularization nén khoảng cách đó.">
    <div className="regularization-workspace"><svg viewBox="0 0 330 210" role="img" aria-label="Train và validation loss theo capacity"><path className="axis" d="M20 15V190H320" /><path className="train-curve" d={path("trainLoss")} /><path className="validation-curve" d={path("validationLoss")} /><line className="capacity-marker" x1={25 + (capacity - 1) * 40} y1="18" x2={25 + (capacity - 1) * 40} y2="190" /></svg><div className="metric-pair"><span>Train loss <strong>{curve.trainLoss.toFixed(2)}</strong></span><span>Validation loss <strong>{curve.validationLoss.toFixed(2)}</strong></span><span>Gap <strong>{curve.gap.toFixed(2)}</strong></span></div><div className="lab-controls two-controls"><label><span>Capacity <output>{capacity}</output></span><input aria-label="Capacity" type="range" min="1" max="8" value={capacity} onChange={(event) => { setCapacity(Number(event.target.value)); setFeedback(null); }} /></label><label><span>Regularization λ <output>{regularization.toFixed(1)}</output></span><input aria-label="Regularization λ" type="range" min="0" max="1" step=".1" value={regularization} onChange={(event) => { setRegularization(Number(event.target.value)); setFeedback(null); }} /></label></div></div>
    <div className="lab-challenge"><div><strong>Balance challenge</strong><p>Đặt capacity 6 và λ = 0.5 để giữ generalization gap dưới 0.12.</p></div><button className="primary-action" onClick={check}>Kiểm tra cân bằng</button></div>{feedback !== null ? <Feedback passed={feedback}>{feedback ? "Đúng: penalty vừa đủ giữ capacity mà không để train–validation tách xa." : "Điều chỉnh cả capacity và λ; đừng chỉ tối thiểu hóa train loss."}</Feedback> : null}
  </LabShell>;
}

function DenseReluLab({ onJudge }: { onJudge: Judge }) {
  const [weightOne, setWeightOne] = useState(.5); const [weightTwo, setWeightTwo] = useState(1); const [bias, setBias] = useState(0); const [feedback, setFeedback] = useState<boolean | null>(null);
  const result = denseForward([2, -1], [weightOne, weightTwo], bias);
  const check = () => { const passed = weightOne === 1 && weightTwo === 2 && bias === 1 && result.activation === 1; setFeedback(passed); onJudge(passed); };
  return <LabShell eyebrow="R4 · DENSE FORWARD PASS" title="Neuron không nhảy thẳng từ input đến output" description="Tách từng contribution, pre-activation z và ReLU để thấy chính xác thông tin bị giữ hay bị chặn ở đâu.">
    <div className="dense-workspace"><div className="dense-equation"><article><span>x₁ × w₁</span><strong>2 × {weightOne.toFixed(1)}</strong><output>{result.contributions[0].toFixed(1)}</output></article><i>＋</i><article><span>x₂ × w₂</span><strong>−1 × {weightTwo.toFixed(1)}</strong><output>{result.contributions[1].toFixed(1)}</output></article><i>＋</i><article><span>bias</span><strong>{bias.toFixed(1)}</strong><output>{bias.toFixed(1)}</output></article><i>→</i><article className="dense-result"><span>z → ReLU(z)</span><strong>{result.preActivation.toFixed(1)} → {result.activation.toFixed(1)}</strong><output>{result.activation > 0 ? "ACTIVE" : "BLOCKED"}</output></article></div><div className="lab-controls three-controls"><label><span>w₁ <output>{weightOne.toFixed(1)}</output></span><input aria-label="w₁" type="range" min="-2" max="2" step=".5" value={weightOne} onChange={(event) => { setWeightOne(Number(event.target.value)); setFeedback(null); }} /></label><label><span>w₂ <output>{weightTwo.toFixed(1)}</output></span><input aria-label="w₂" type="range" min="-2" max="2" step=".5" value={weightTwo} onChange={(event) => { setWeightTwo(Number(event.target.value)); setFeedback(null); }} /></label><label><span>bias <output>{bias.toFixed(1)}</output></span><input aria-label="bias" type="range" min="-2" max="2" step=".5" value={bias} onChange={(event) => { setBias(Number(event.target.value)); setFeedback(null); }} /></label></div></div>
    <div className="lab-challenge"><div><strong>Forward-pass challenge</strong><p>Đặt w₁ = 1, w₂ = 2, bias = 1 và xác minh ReLU output bằng 1.</p></div><button className="primary-action" onClick={check}>Chốt forward pass</button></div>{feedback !== null ? <Feedback passed={feedback}>{feedback ? "Đúng: 2 − 2 + 1 = 1, nên ReLU giữ nguyên tín hiệu dương." : "Đọc từng contribution trước khi cộng bias; ReLU chỉ chạy sau khi z đã hoàn tất."}</Feedback> : null}
  </LabShell>;
}

function BackpropLab({ onJudge }: { onJudge: Judge }) {
  const [learningRate, setLearningRate] = useState(.1); const [direction, setDirection] = useState<"increase" | "decrease" | null>(null); const [feedback, setFeedback] = useState<boolean | null>(null);
  const step = gradientStep({ x: 2, weight: 1, target: 6, learningRate });
  const check = () => { const passed = Math.abs(learningRate - .25) < .001 && direction === "increase" && step.nextLoss < step.loss; setFeedback(passed); onJudge(passed); };
  return <LabShell eyebrow="R4 · BACKPROP CHAIN RULE" title="Gradient phải đi ngược, loss mới đi xuống" description="Theo một scalar network từ prediction đến loss rồi quay ngược về weight; update được kiểm tra bằng loss mới, không bằng dấu gradient riêng lẻ.">
    <div className="backprop-workspace"><div className="gradient-chain"><article><span>ŷ = xw</span><strong>{step.prediction.toFixed(1)}</strong><small>x=2 · w=1</small></article><i>→</i><article><span>error</span><strong>{step.error.toFixed(1)}</strong><small>ŷ − target</small></article><i>→</i><article><span>½ error²</span><strong>{step.loss.toFixed(1)}</strong><small>loss</small></article><i>↶</i><article className="gradient-card"><span>∂L/∂w</span><strong>{step.gradient.toFixed(1)}</strong><small>(ŷ−y) × x</small></article></div><div className="weight-update"><span>w′ = w − η∇w</span><strong>1 − {learningRate.toFixed(2)} × ({step.gradient.toFixed(1)}) = {step.nextWeight.toFixed(2)}</strong><div><span>Loss trước <b>{step.loss.toFixed(2)}</b></span><span>Loss sau <b>{step.nextLoss.toFixed(2)}</b></span></div></div><div className="lab-controls"><label><span>Learning rate η <output>{learningRate.toFixed(2)}</output></span><input aria-label="Learning rate η" type="range" min=".05" max=".5" step=".05" value={learningRate} onChange={(event) => { setLearningRate(Number(event.target.value)); setFeedback(null); }} /></label></div><div className="role-choice"><span>Gradient âm làm update này...</span>{([['increase', 'tăng weight'], ['decrease', 'giảm weight']] as const).map(([value, label]) => <button aria-pressed={direction === value} className={direction === value ? "selected" : ""} key={value} onClick={() => { setDirection(value); setFeedback(null); }}>{label}</button>)}</div></div>
    <div className="lab-challenge"><div><strong>One-step challenge</strong><p>Đặt η = 0.25 và chọn đúng hướng update để loss từ 8 về 0.</p></div><button className="primary-action" disabled={!direction} onClick={check}>Kiểm tra gradient</button></div>{feedback !== null ? <Feedback passed={feedback}>{feedback ? "Đúng: gradient −8 làm w tăng từ 1 lên 3; prediction chạm target 6." : "Gradient descent trừ gradient. Với gradient âm, weight phải tăng; sau đó kiểm tra loss mới."}</Feedback> : null}
  </LabShell>;
}

function TokenEmbeddingLab({ onJudge }: { onJudge: Judge }) {
  const [mode, setMode] = useState<"word" | "subword">("word"); const [feedback, setFeedback] = useState<boolean | null>(null); const result = tokenizeForEmbedding("unhelpful model", mode);
  const check = () => { const passed = mode === "subword" && result.unknownCount === 0 && result.tokens.join("|") === "un|help|ful|model"; setFeedback(passed); onJudge(passed); };
  return <LabShell eyebrow="R4 · TEXT TO VECTORS" title="LLM chỉ thấy token ID và vector" description="Một từ chưa từng có có thể thành unknown ở word-level, nhưng subword tokenizer ghép lại từ những mảnh vocabulary đã biết.">
    <div className="token-workspace"><div className="token-input"><span>RAW TEXT</span><strong>unhelpful model</strong></div><div className="token-mode" role="group" aria-label="Chế độ tokenization"><button aria-pressed={mode === "word"} className={mode === "word" ? "selected" : ""} onClick={() => { setMode("word"); setFeedback(null); }}>Word-level</button><button aria-pressed={mode === "subword"} className={mode === "subword" ? "selected" : ""} onClick={() => { setMode("subword"); setFeedback(null); }}>Subword</button></div><div className="token-sequence">{result.tokens.map((token, index) => <article className={token === "<unk>" ? "unknown" : ""} key={`${token}-${index}`}><span>token {index + 1}</span><strong>{token}</strong><code>[{result.vectors[index].map((value) => value.toFixed(1)).join(", ")}]</code></article>)}</div><div className="embedding-readout"><span>POOLED EMBEDDING</span><strong>[{result.pooled.map((value) => value.toFixed(2)).join(", ")}]</strong><small>{result.unknownCount} unknown token</small></div></div>
    <div className="lab-challenge"><div><strong>Vocabulary challenge</strong><p>Chọn chế độ tạo đúng 4 token “un | help | ful | model” mà không sinh unknown.</p></div><button className="primary-action" onClick={check}>Kiểm tra encoding</button></div>{feedback !== null ? <Feedback passed={feedback}>{feedback ? "Đúng: subword tái sử dụng các mảnh đã biết rồi lookup embedding cho từng token." : "Word-level không có toàn bộ từ ‘unhelpful’; hãy thử ghép từ các mảnh vocabulary."}</Feedback> : null}
  </LabShell>;
}

function AttentionLab({ onJudge }: { onJudge: Judge }) {
  const [subjectFocus, setSubjectFocus] = useState(.8); const [choice, setChoice] = useState<string | null>(null); const [feedback, setFeedback] = useState<boolean | null>(null); const snapshot = attentionSnapshot(subjectFocus);
  const check = () => { const passed = subjectFocus <= .2 && choice === "slowly" && snapshot.winner === "slowly"; setFeedback(passed); onJudge(passed); };
  return <LabShell eyebrow="R4 · SCALED DOT-PRODUCT ATTENTION" title="Query quyết định token nào được nghe lớn hơn" description="Đổi hướng query để scores thay đổi; softmax biến chúng thành trọng số rồi trộn value thành context vector.">
    <div className="attention-workspace"><label><span>Query emphasis <output>{subjectFocus.toFixed(1)} subject / {(1 - subjectFocus).toFixed(1)} behavior</output></span><input aria-label="Query emphasis" type="range" min="0" max="1" step=".1" value={subjectFocus} onChange={(event) => { setSubjectFocus(Number(event.target.value)); setChoice(null); setFeedback(null); }} /></label><div className="attention-bars">{["database", "scales", "slowly"].map((token, index) => <button aria-pressed={choice === token} className={choice === token ? "selected" : ""} key={token} onClick={() => { setChoice(token); setFeedback(null); }}><span>{token}</span><i><b style={{ width: `${snapshot.weights[index] * 100}%` }} /></i><strong>{(snapshot.weights[index] * 100).toFixed(1)}%</strong></button>)}</div><div className="embedding-readout"><span>CONTEXT VECTOR</span><strong>[{snapshot.context.map((value) => value.toFixed(2)).join(", ")}]</strong><small>Σ attention weight = {snapshot.weights.reduce((sum, value) => sum + value, 0).toFixed(2)}</small></div></div>
    <div className="lab-challenge"><div><strong>Attention challenge</strong><p>Kéo query về ≤ 0.2 subject để ưu tiên behavior, rồi chọn token nhận trọng số cao nhất.</p></div><button className="primary-action" disabled={!choice} onClick={check}>Chốt attention</button></div>{feedback !== null ? <Feedback passed={feedback}>{feedback ? "Đúng: query thiên về behavior khớp key của ‘slowly’, nên token này có attention lớn nhất." : "So sánh các thanh sau khi query nghiêng mạnh về behavior; chọn token có softmax weight lớn nhất."}</Feedback> : null}
  </LabShell>;
}

function AiEvaluationLab({ onJudge }: { onJudge: Judge }) {
  const [minimumQuality, setMinimumQuality] = useState(.8); const [maximumLatency, setMaximumLatency] = useState(1000); const [maximumCost, setMaximumCost] = useState(1.2); const [choice, setChoice] = useState<string | null>(null); const [feedback, setFeedback] = useState<boolean | null>(null);
  const results = evaluateAiCandidates({ minimumQuality, maximumLatency, maximumCost });
  const check = () => { const eligible = results.filter((candidate) => candidate.eligible).map((candidate) => candidate.id); const passed = minimumQuality === .85 && maximumLatency === 800 && maximumCost === 1 && choice === "rag" && eligible.length === 1 && eligible[0] === "rag"; setFeedback(passed); onJudge(passed); };
  return <LabShell eyebrow="R4 · SYSTEM EVALUATION" title="Model tốt nhất là model đủ điều kiện cho use case" description="Quality, latency và cost là ba cổng đồng thời. Candidate đứng đầu một benchmark vẫn có thể bị loại vì vi phạm ràng buộc vận hành.">
    <div className="evaluation-workspace"><div className="lab-controls three-controls"><label><span>Min quality <output>{Math.round(minimumQuality * 100)}%</output></span><input aria-label="Min quality" type="range" min=".75" max=".95" step=".01" value={minimumQuality} onChange={(event) => { setMinimumQuality(Number(event.target.value)); setChoice(null); setFeedback(null); }} /></label><label><span>Max latency <output>{maximumLatency}ms</output></span><input aria-label="Max latency" type="range" min="200" max="1600" step="50" value={maximumLatency} onChange={(event) => { setMaximumLatency(Number(event.target.value)); setChoice(null); setFeedback(null); }} /></label><label><span>Max cost <output>${maximumCost.toFixed(1)}</output></span><input aria-label="Max cost" type="range" min=".2" max="2" step=".1" value={maximumCost} onChange={(event) => { setMaximumCost(Number(event.target.value)); setChoice(null); setFeedback(null); }} /></label></div><div className="candidate-grid">{results.map((candidate) => <button aria-pressed={choice === candidate.id} className={`${choice === candidate.id ? "selected " : ""}${candidate.eligible ? "eligible" : "blocked"}`} key={candidate.id} onClick={() => { setChoice(candidate.id); setFeedback(null); }}><span>{candidate.eligible ? "ELIGIBLE" : "BLOCKED"}</span><strong>{candidate.label}</strong><div><em className={candidate.checks.quality ? "pass" : "fail"}>Q {Math.round(candidate.quality * 100)}%</em><em className={candidate.checks.latency ? "pass" : "fail"}>{candidate.latency}ms</em><em className={candidate.checks.cost ? "pass" : "fail"}>${candidate.cost.toFixed(1)}</em></div></button>)}</div></div>
    <div className="lab-challenge"><div><strong>Production-fit challenge</strong><p>Đặt quality ≥85%, latency ≤800ms, cost ≤$1.0 và chọn candidate duy nhất vượt cả ba cổng.</p></div><button className="primary-action" disabled={!choice} onClick={check}>Chốt model</button></div>{feedback !== null ? <Feedback passed={feedback}>{feedback ? "Đúng: Mid model + RAG không đứng đầu mọi metric, nhưng là phương án duy nhất thỏa toàn bộ constraints." : "Hard constraint là cổng AND: một dấu fail cũng đủ loại candidate khỏi use case này."}</Feedback> : null}
  </LabShell>;
}

function LabRenderer({ labId, onJudge }: { labId: ExpansionLabId; onJudge: Judge }) {
  if (labId === "logic-truth-table") return <TruthTableLab onJudge={onJudge} />;
  if (labId === "probability-conditional") return <ConditionalProbabilityLab onJudge={onJudge} />;
  if (labId === "probability-bayes") return <BayesLab onJudge={onJudge} />;
  if (labId === "linear-vectors") return <VectorMagnitudeLab onJudge={onJudge} />;
  if (labId === "linear-transform") return <LinearTransformLab onJudge={onJudge} />;
  if (labId === "sql-select") return <SqlLab onJudge={onJudge} />;
  if (labId === "sql-join-aggregate") return <JoinAggregateLab onJudge={onJudge} />;
  if (labId === "sql-advanced-relations") return <AdvancedSqlLab onJudge={onJudge} />;
  if (labId === "complexity-growth") return <ComplexityLab onJudge={onJudge} />;
  if (labId === "queue-behavior") return <QueueBehaviorLab onJudge={onJudge} />;
  if (labId === "ml-threshold") return <ConfusionThresholdLab onJudge={onJudge} />;
  if (labId === "ml-split") return <SplitSimulatorLab onJudge={onJudge} />;
  if (labId === "ml-leakage") return <LeakageLab onJudge={onJudge} />;
  if (labId === "ml-knn-scaling") return <KnnScalingLab onJudge={onJudge} />;
  if (labId === "ml-regularization") return <RegularizationLab onJudge={onJudge} />;
  if (labId === "dl-dense-relu") return <DenseReluLab onJudge={onJudge} />;
  if (labId === "dl-backprop") return <BackpropLab onJudge={onJudge} />;
  if (labId === "llm-token-embedding") return <TokenEmbeddingLab onJudge={onJudge} />;
  if (labId === "llm-attention") return <AttentionLab onJudge={onJudge} />;
  if (labId === "ai-evaluation") return <AiEvaluationLab onJudge={onJudge} />;
  return <BfsLab onJudge={onJudge} />;
}

function PrerequisiteBridge({ edge, progress, onProgress, onContinue }: { edge: ExpansionPrerequisiteEdge; progress: ExpansionProgress; onProgress: (progress: ExpansionProgress) => void; onContinue: () => void }) {
  const [choice, setChoice] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ passed: boolean; text: string } | null>(null);
  const submit = () => {
    if (choice === null) return;
    const result = submitPrerequisiteEdge(progress, edge.id, choice);
    onProgress(result.progress);
    recordLearningEvent({ eventType: "activity_attempt", lessonId: edge.to, activityId: `bridge:${edge.id}`, outcome: result.passed ? "pass" : "fail" });
    setFeedback({ passed: result.passed, text: result.passed ? `${edge.explanation} Bài ${getExpansionLab(edge.to).title} đã mở.` : "Biến thể này chưa qua. Hãy dùng cơ chế của bài nguồn trên tình huống mới, không lặp lại đáp án cũ." });
  };
  return <section className="prerequisite-bridge"><header><span className="mono-label">PREREQUISITE EDGE · TRANSFER CHECK</span><strong>{getExpansionLab(edge.from).title} → {getExpansionLab(edge.to).title}</strong><p>{edge.prompt}</p></header><div className="bridge-options">{edge.options.map((option, index) => <button aria-pressed={choice === index} className={choice === index ? "selected" : ""} disabled={Boolean(feedback?.passed)} key={option} onClick={() => { setChoice(index); setFeedback(null); }}><span>{String.fromCharCode(65 + index)}</span>{option}</button>)}</div><footer><small>Node tiếp theo chỉ mở khi edge này có evidence riêng.</small>{feedback?.passed ? <button className="primary-action" onClick={onContinue}>Mở bài tiếp theo →</button> : <button className="primary-action" disabled={choice === null} onClick={submit}>Kiểm tra transfer</button>}</footer>{feedback ? <Feedback passed={feedback.passed}>{feedback.text}</Feedback> : null}</section>;
}

function DelayedReviewCard({ labId, progress, onProgress, onClose }: { labId: ExpansionLabId; progress: ExpansionProgress; onProgress: (progress: ExpansionProgress) => void; onClose: () => void }) {
  const lab = getExpansionLab(labId); const [choice, setChoice] = useState<number | null>(null); const [feedback, setFeedback] = useState<{ passed: boolean; text: string } | null>(null);
  const submit = () => {
    if (choice === null) return;
    const result = submitExpansionReview(progress, labId, choice);
    if (result.reason === "not_due") { setFeedback({ passed: false, text: "Review chưa đến hạn hoặc đã hoàn tất." }); return; }
    onProgress(result.progress);
    recordLearningEvent({ eventType: "delayed_review", lessonId: labId, activityId: `${labId}-delayed-review`, outcome: result.passed ? "pass" : "fail" });
    setFeedback({ passed: result.passed, text: result.passed ? lab.review.explanation : "Biến thể chưa đạt. Evidence luyện tập vẫn giữ nguyên; thử lại khi đã tự giải thích được cơ chế." });
  };
  return <section className="expansion-review-card"><header><div><span className="mono-label">DELAYED TRANSFER · ≥72 HOURS</span><h2>{lab.title}</h2><p>{lab.review.prompt}</p></div><button className="text-link" onClick={onClose}>Đóng</button></header><div className="review-options">{lab.review.options.map((option, index) => <button aria-pressed={choice === index} className={choice === index ? "selected" : ""} disabled={Boolean(feedback?.passed)} key={option} onClick={() => { setChoice(index); setFeedback(null); }}><span>{String.fromCharCode(65 + index)}</span>{option}</button>)}</div><footer><small>Mastered chỉ mở khi biến thể đến hạn được trả lời đúng.</small><button className="primary-action" disabled={choice === null || Boolean(feedback?.passed)} onClick={submit}>Chấm delayed review</button></footer>{feedback ? <Feedback passed={feedback.passed}>{feedback.text}</Feedback> : null}</section>;
}

export function ExpansionWorkbench({ initialLabId = "logic-truth-table", initialReviewLabId = null, initialEdgeId = null, onBack, onReviewClose }: { initialLabId?: string; initialReviewLabId?: ExpansionLabId | null; initialEdgeId?: ExpansionEdgeId | null; onBack: () => void; onReviewClose?: () => void }) {
  const safeInitial = isExpansionLabId(initialLabId) ? initialLabId : "logic-truth-table";
  const [progress, setProgress] = useState<ExpansionProgress>(emptyExpansionProgress);
  const [retryVersion, setRetryVersion] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [latestPassedEdgeId, setLatestPassedEdgeId] = useState<string | null>(null);
  const [focusedEdgeId, setFocusedEdgeId] = useState<ExpansionEdgeId | null>(initialEdgeId);
  const initialTrackId = getExpansionLab(safeInitial).trackId;
  const initialActiveLabId = isExpansionLabUnlocked(progress, safeInitial) ? safeInitial : trackLabs(initialTrackId).find((lab) => isExpansionLabUnlocked(progress, lab.id))?.id ?? trackLabs(initialTrackId)[0].id;
  const [trackId, setTrackId] = useState<ExpansionTrackId>(initialTrackId);
  const [activeLabId, setActiveLabId] = useState<ExpansionLabId>(initialActiveLabId);
  const [reviewLabId, setReviewLabId] = useState<ExpansionLabId | null>(() => initialReviewLabId && dueExpansionReviews(progress).includes(initialReviewLabId) ? initialReviewLabId : null);
  const [clock, setClock] = useState(0);
  const activeLab = getExpansionLab(activeLabId);
  const visibleLabs = useMemo(() => trackLabs(trackId), [trackId]);
  const completedInTrack = visibleLabs.filter((lab) => progress.completedLabIds.includes(lab.id)).length;
  const mastered = masteredExpansionLabs(progress);
  const masteredInTrack = visibleLabs.filter((lab) => mastered.includes(lab.id)).length;
  const dueInTrack = dueExpansionReviews(progress, clock).filter((labId) => getExpansionLab(labId).trackId === trackId);
  const scheduledInTrack = visibleLabs.filter((lab) => progress.reviews[lab.id] && !progress.reviews[lab.id]?.passedAt && !dueInTrack.includes(lab.id));

  useEffect(() => {
    queueMicrotask(() => {
      const restored = readProgress();
      setProgress(restored);
      if (isExpansionLabUnlocked(restored, safeInitial)) {
        setTrackId(getExpansionLab(safeInitial).trackId);
        setActiveLabId(safeInitial);
      }
      if (initialReviewLabId && dueExpansionReviews(restored, Date.now()).includes(initialReviewLabId)) setReviewLabId(initialReviewLabId);
      setFocusedEdgeId(initialEdgeId);
      setClock(Date.now());
      setHydrated(true);
    });
  }, [initialEdgeId, initialReviewLabId, safeInitial]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(EXPANSION_PROGRESS_KEY, JSON.stringify(progress));
      LEGACY_EXPANSION_PROGRESS_KEYS.forEach((key) => window.localStorage.removeItem(key));
    } catch { /* Current-session progress remains visible and legacy state is preserved. */ }
    queueMicrotask(() => setClock(Date.now()));
  }, [progress, hydrated]);

  const judge: Judge = (passed, hintLevel = 0) => {
    recordLearningEvent({ eventType: "activity_attempt", lessonId: activeLabId, activityId: `${activeLabId}-challenge`, outcome: passed ? "pass" : "fail", hintLevel });
    setProgress((current) => passed ? completeExpansionLab(current, activeLabId, Date.now(), hintLevel) : recordExpansionAttempt(current, activeLabId, hintLevel));
  };
  const chooseTrack = (next: ExpansionTrackId) => {
    setTrackId(next); setReviewLabId(null); setFocusedEdgeId(null);
    const labs = trackLabs(next); const first = labs.find((lab) => isExpansionLabUnlocked(progress, lab.id) && !progress.completedLabIds.includes(lab.id)) ?? labs.find((lab) => isExpansionLabUnlocked(progress, lab.id)) ?? labs[0];
    setActiveLabId(first.id);
  };
  const chooseLab = (labId: ExpansionLabId) => { if (!isExpansionLabUnlocked(progress, labId)) return; setActiveLabId(labId); setReviewLabId(null); setFocusedEdgeId(null); };
  const closeReview = () => { setReviewLabId(null); onReviewClose?.(); };
  const currentTrack = expansionTracks.find((track) => track.id === trackId) ?? expansionTracks[0];
  const allPendingEdges = outgoingPrerequisiteEdges(activeLabId).filter((edge) => progress.completedLabIds.includes(edge.from) && (!progress.passedEdgeIds.includes(edge.id) || latestPassedEdgeId === edge.id));
  const focusedEdge = focusedEdgeId ? allPendingEdges.find((edge) => edge.id === focusedEdgeId) : null;
  const pendingEdges = focusedEdge ? [focusedEdge] : allPendingEdges;

  return <div className="expansion-canvas track-studio">
    <header className="expansion-header"><div><button className="back-link" onClick={onBack}>← Quay lại</button><span className="mono-label">LEARNING STUDIO · R1–R4</span><h1>Phòng thực hành</h1><p>{expansionLabs.length} lab từ toán đến hệ thống AI. Chọn một lộ trình, thực hành và quay lại giải một biến thể sau ít nhất 72 giờ.</p></div><div className="expansion-score"><strong>{progress.completedLabIds.length}/{expansionLabs.length}</strong><span>lab đã thực hành</span><small>{mastered.length} đã vững · {dueExpansionReviews(progress, clock).length} bài đến hạn</small></div></header>
    <nav className="track-switcher" aria-label="Chọn lộ trình thực hành">{expansionTracks.map((track) => { const labs = trackLabs(track.id); const count = labs.filter((lab) => progress.completedLabIds.includes(lab.id)).length; return <button aria-pressed={track.id === trackId} className={track.id === trackId ? "active" : ""} key={track.id} onClick={() => chooseTrack(track.id)}><span>{track.release}</span><strong>{track.title}</strong><small>{count}/{labs.length} lab đã luyện</small></button>; })}</nav>
    <section className="track-intro"><div><span className="mono-label">LỘ TRÌNH {currentTrack.release}</span><h2>{currentTrack.title}</h2><p>{currentTrack.description}</p></div><div><div className="progress-track"><i className="indigo" style={{ width: `${completedInTrack / visibleLabs.length * 100}%` }} /></div><small>{completedInTrack} đã luyện · {masteredInTrack} đã vững</small></div></section>
    <section className={dueInTrack.length ? "expansion-review-strip due" : "expansion-review-strip"}><div><span className="mono-label">LỊCH ÔN TẬP</span><strong>{dueInTrack.length ? `${dueInTrack.length} biến thể đang đến hạn` : scheduledInTrack.length ? `${scheduledInTrack.length} biến thể đã lên lịch` : "Chưa có review được xếp lịch"}</strong><p>{dueInTrack.length ? "Ôn từ biến thể mới; đáp án thực hành cũ không xuất hiện ở đây." : "Hoàn thành một lab sẽ tự xếp review sau 72 giờ."}</p></div>{dueInTrack.length ? <button className="primary-action" onClick={() => setReviewLabId(dueInTrack[0])}>Ôn {getExpansionLab(dueInTrack[0]).title} →</button> : scheduledInTrack.length ? <span className="review-clock">{clock ? `T−${Math.max(1, Math.ceil((Date.parse(progress.reviews[scheduledInTrack[0].id]?.dueAt ?? "") - clock) / 3_600_000))}h` : "Đã lên lịch"}</span> : null}</section>
    {reviewLabId ? <DelayedReviewCard labId={reviewLabId} progress={progress} onProgress={setProgress} onClose={closeReview} /> : null}
    <div className="expansion-workspace"><aside className="lab-index" aria-label={`Các bài trong ${currentTrack.title}`}>{visibleLabs.map((lab) => { const complete = progress.completedLabIds.includes(lab.id); const isMastered = mastered.includes(lab.id); const unlocked = isExpansionLabUnlocked(progress, lab.id); const missing = lab.prerequisites.map((id) => ({ id, edge: outgoingPrerequisiteEdges(id).find((edge) => edge.to === lab.id) })).filter(({ id, edge }) => !progress.completedLabIds.includes(id) || !edge || !progress.passedEdgeIds.includes(edge.id)).map(({ id, edge }) => progress.completedLabIds.includes(id) && edge ? `transfer từ ${getExpansionLab(id).title}` : getExpansionLab(id).title); return <button aria-pressed={lab.id === activeLabId} disabled={!unlocked} className={lab.id === activeLabId ? "active" : isMastered ? "mastered" : complete ? "complete" : !unlocked ? "locked" : ""} key={lab.id} onClick={() => chooseLab(lab.id)}><span>{isMastered ? "◆" : complete ? "✓" : !unlocked ? "⌁" : lab.index}</span><strong>{lab.title}</strong><small>{!unlocked ? `Cần: ${missing.join(", ")}` : isMastered ? "Delayed review đạt" : lab.outcome}</small></button>; })}</aside><section className="lab-stage" aria-labelledby="current-lab-name"><header className="active-lab-bar"><div><span className="mono-label">{currentTrack.release} · BÀI {activeLab.index}</span><h2 id="current-lab-name">{activeLab.title}</h2></div><button className="outline-action" onClick={() => setRetryVersion((version) => version + 1)}>Làm lại độc lập, không gợi ý</button></header><LabRenderer key={`${activeLabId}-${retryVersion}`} labId={activeLabId} onJudge={judge} />{pendingEdges.map((edge) => <PrerequisiteBridge edge={edge} progress={progress} onProgress={(next) => { setProgress(next); if (next.passedEdgeIds.includes(edge.id)) setLatestPassedEdgeId(edge.id); }} onContinue={() => { setLatestPassedEdgeId(null); setFocusedEdgeId(null); chooseLab(edge.to); }} key={edge.id} />)}<footer className="lab-source"><span>MECHANISM</span><p>{activeLab.mechanism}</p><small>Nguồn: {activeLab.source.title} · {activeLab.source.locator}</small></footer></section></div>
  </div>;
}
