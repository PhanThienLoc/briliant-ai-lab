import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { expansionLabs, expansionTracks, prerequisiteEdges } from "../lib/expansion-catalog.ts";
import { customersTable, executeSelect, gradeHavingQuery, gradeOuterJoinQuery, gradeSouthOrderQuery, gradeSubqueryQuery, gradeTierRevenueQuery, ordersTable, passesHavingChallenge, passesOuterJoinChallenge, passesSouthOrderChallenge, passesSubqueryChallenge, passesTierRevenueChallenge } from "../lib/sql-sandbox.mjs";

test("R1 through R4 ship prerequisite-aware sourced mechanism labs", () => {
  assert.equal(expansionTracks.length, 4);
  assert.equal(expansionLabs.length, 21);
  assert.equal(new Set(expansionLabs.map((lab) => lab.id)).size, 21);
  assert.equal(expansionLabs.filter((lab) => lab.trackId === "r1-math").length, 5);
  assert.equal(expansionLabs.filter((lab) => lab.trackId === "r2-sql-algorithms").length, 6);
  assert.equal(expansionLabs.filter((lab) => lab.trackId === "r3-machine-learning").length, 5);
  assert.equal(expansionLabs.filter((lab) => lab.trackId === "r4-deep-learning-llm").length, 5);
  for (const lab of expansionLabs) {
    assert.ok(lab.outcome.length > 20);
    assert.ok(lab.mechanism.includes("→"));
    assert.ok(lab.source.title.length > 10);
    assert.ok(lab.source.locator.length > 10);
    assert.equal(lab.review.options.length, 3);
    assert.ok(lab.prerequisites.every((id) => expansionLabs.some((candidate) => candidate.id === id)));
    assert.ok(lab.prerequisites.every((id) => prerequisiteEdges.some((edge) => edge.from === id && edge.to === lab.id)));
  }
  assert.equal(prerequisiteEdges.length, 12);
});

test("SELECT sandbox grades result behavior rather than query spelling", () => {
  const canonical = executeSelect("SELECT id, amount FROM orders WHERE region = 'south' AND amount >= 180 ORDER BY amount DESC;");
  const equivalent = executeSelect("select id,amount from orders where amount>=180 and region=\"south\" order by amount desc");

  assert.equal(ordersTable.length, 9);
  assert.equal(canonical.error, null);
  assert.deepEqual(canonical.rows.map((row) => row.id), [6, 2, 4]);
  assert.equal(passesSouthOrderChallenge(canonical), true);
  assert.equal(passesSouthOrderChallenge(equivalent), true);
  assert.equal(gradeSouthOrderQuery("SELECT id, amount FROM orders WHERE region = 'south' ORDER BY amount DESC").passed, false);
  assert.deepEqual(gradeSouthOrderQuery("SELECT id, amount FROM orders WHERE region = 'south' AND amount >= 180 ORDER BY amount DESC"), { passed: true, fixturesPassed: 3, fixturesTotal: 3 });
});

test("JOIN and aggregate sandbox grades equivalent relational queries by result", () => {
  const canonical = executeSelect(`
    SELECT customers.tier, COUNT(*) AS order_count, SUM(orders.amount) AS revenue
    FROM orders
    JOIN customers ON orders.customer_id = customers.id
    WHERE orders.status = 'paid'
    GROUP BY customers.tier
    ORDER BY revenue DESC;
  `);
  const equivalent = executeSelect(`
    select customers.tier, count(*), sum(orders.amount)
    from customers inner join orders on customers.id = orders.customer_id
    where orders.status = "paid"
    group by customers.tier
    order by sum_orders_amount desc
  `);

  assert.equal(customersTable.length, 9);
  assert.deepEqual(canonical.rows, [
    { tier: "enterprise", order_count: 2, revenue: 650 },
    { tier: "starter", order_count: 1, revenue: 160 },
    { tier: "pro", order_count: 1, revenue: 120 },
  ]);
  assert.equal(passesTierRevenueChallenge(canonical), true);
  assert.equal(passesTierRevenueChallenge(equivalent), true);
  assert.equal(gradeTierRevenueQuery(`SELECT customers.tier, COUNT(*) AS order_count, SUM(orders.amount) AS revenue FROM orders JOIN customers ON orders.customer_id = customers.id WHERE orders.status = 'paid' GROUP BY customers.tier ORDER BY revenue DESC`).passed, true);
});

test("advanced SQL supports HAVING aliases and aggregate expressions", () => {
  const byAlias = executeSelect(`
    SELECT customers.tier, SUM(orders.amount) AS revenue
    FROM orders JOIN customers ON orders.customer_id = customers.id
    WHERE orders.status = 'paid'
    GROUP BY customers.tier
    HAVING revenue >= 200
    ORDER BY revenue DESC
  `);
  const byExpression = executeSelect(`
    SELECT customers.tier, SUM(orders.amount) AS revenue
    FROM customers JOIN orders ON customers.id = orders.customer_id
    WHERE orders.status = 'paid'
    GROUP BY customers.tier
    HAVING SUM(orders.amount) >= 200
  `);
  assert.equal(passesHavingChallenge(byAlias), true);
  assert.equal(passesHavingChallenge(byExpression), true);
  assert.match(byAlias.plan.join(" "), /HAVING/);
  assert.equal(gradeHavingQuery(`SELECT customers.tier, SUM(orders.amount) AS revenue FROM orders JOIN customers ON orders.customer_id = customers.id WHERE orders.status = 'paid' GROUP BY customers.tier HAVING revenue >= 200 ORDER BY revenue DESC`).passed, true);
});

test("advanced SQL executes one safe scalar aggregate subquery", () => {
  const result = executeSelect(`
    SELECT id, amount FROM orders
    WHERE amount > (SELECT AVG(amount) FROM orders)
    ORDER BY amount DESC
  `);
  assert.equal(passesSubqueryChallenge(result), true);
  assert.deepEqual(result.rows, [{ id: 6, amount: 430 }, { id: 5, amount: 310 }, { id: 2, amount: 220 }]);
  assert.match(executeSelect("SELECT id FROM orders WHERE amount > (SELECT AVG(amount) FROM orders WHERE id > (SELECT AVG(id) FROM orders))").error, /nhiều tầng|Subquery/i);
  assert.equal(gradeSubqueryQuery("SELECT id, amount FROM orders WHERE amount > (SELECT AVG(amount) FROM orders) ORDER BY amount DESC").passed, true);
});

test("LEFT, RIGHT and FULL OUTER JOIN preserve unmatched rows", () => {
  const left = executeSelect("SELECT customers.name, orders.id AS order_id FROM customers LEFT OUTER JOIN orders ON customers.id = orders.customer_id ORDER BY name ASC");
  const right = executeSelect("SELECT orders.id AS order_id, customers.name FROM customers RIGHT JOIN orders ON customers.id = orders.customer_id ORDER BY order_id ASC");
  const full = executeSelect("SELECT orders.id AS order_id, customers.name FROM orders FULL OUTER JOIN customers ON orders.customer_id = customers.id ORDER BY order_id ASC");
  assert.equal(left.rows.some((row) => row.name === "Mai" && row.order_id === null), true);
  assert.equal(right.rows.some((row) => row.order_id === 9 && row.name === null), true);
  assert.equal(passesOuterJoinChallenge(full), true);
  assert.equal(gradeOuterJoinQuery("SELECT orders.id AS order_id, customers.name FROM orders FULL OUTER JOIN customers ON orders.customer_id = customers.id ORDER BY order_id ASC").passed, true);
});

test("SELECT sandbox keeps the local read-only boundary explicit", () => {
  assert.match(executeSelect("DELETE FROM orders").error, /chỉ cho phép.*SELECT/i);
  assert.match(executeSelect("SELECT secret FROM orders").error, /cột không tồn tại/i);
  assert.match(executeSelect("SELECT * FROM orders; SELECT * FROM orders").error, /một câu SELECT/i);
  assert.match(executeSelect("SELECT id FROM orders WHERE customer LIKE 'A%'").error, /WHERE hỗ trợ/i);
  assert.match(executeSelect("SELECT customers.name, SUM(orders.amount) FROM orders JOIN customers ON orders.customer_id = customers.id GROUP BY customers.tier").error, /GROUP BY/i);
});

test("dashboard exposes the expansion workbench on desktop and mobile", async () => {
  const [dashboard, workbench] = await Promise.all([
    readFile(new URL("../app/learning-dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/expansion-workbench.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(dashboard, /id: "tracks", label: "Tracks R0–R4"/);
  assert.match(dashboard, /view === "tracks".*<ExpansionWorkbench/);
  assert.match(dashboard, /<SecondaryTools view=\{view\}/);
  assert.match(dashboard, /secondaryItems\.map/);
  assert.match(dashboard, /R0 \+ R1 \+ R2 \+ R3 \+ R4 · SPACED REVIEW/);
  assert.match(dashboard, /initialReviewLabId=\{activeExpansionReviewId\}/);
  assert.match(workbench, /function TruthTableLab/);
  assert.match(workbench, /function BayesLab/);
  assert.match(workbench, /function ConditionalProbabilityLab/);
  assert.match(workbench, /function VectorMagnitudeLab/);
  assert.match(workbench, /function LinearTransformLab/);
  assert.match(workbench, /function SqlLab/);
  assert.match(workbench, /function JoinAggregateLab/);
  assert.match(workbench, /function AdvancedSqlLab/);
  assert.match(workbench, /function PrerequisiteBridge/);
  assert.match(workbench, /function ComplexityLab/);
  assert.match(workbench, /function QueueBehaviorLab/);
  assert.match(workbench, /function BfsLab/);
  assert.match(workbench, /function ConfusionThresholdLab/);
  assert.match(workbench, /function SplitSimulatorLab/);
  assert.match(workbench, /function LeakageLab/);
  assert.match(workbench, /function KnnScalingLab/);
  assert.match(workbench, /function RegularizationLab/);
  assert.match(workbench, /function DenseReluLab/);
  assert.match(workbench, /function BackpropLab/);
  assert.match(workbench, /function TokenEmbeddingLab/);
  assert.match(workbench, /function AttentionLab/);
  assert.match(workbench, /function AiEvaluationLab/);
  assert.match(workbench, /function DelayedReviewCard/);
});
