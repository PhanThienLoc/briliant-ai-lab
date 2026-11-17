import test from "node:test";
import assert from "node:assert/strict";
import { executeSelect } from "../lib/sql-sandbox.mjs";

const outerJoin = "FROM orders FULL OUTER JOIN customers ON orders.customer_id = customers.id";
const aggregates = "COUNT(*) AS total, COUNT(amount) AS present, SUM(amount) AS sum, AVG(amount) AS avg, MIN(amount) AS min, MAX(amount) AS max";

for (const operator of ["<", "<=", "!="]) {
  test(`WHERE excludes NULL from ordinary ${operator} comparisons`, () => {
    const result = executeSelect(`SELECT orders.id AS id ${outerJoin} WHERE orders.id ${operator} 1`);
    assert.equal(result.error, null);
    assert.equal(result.rows.some((row) => row.id === null), false);
  });
}

test("empty scalar aggregates return COUNT zero and other aggregates NULL", () => {
  const result = executeSelect(`SELECT ${aggregates} FROM orders WHERE amount > 9999`);
  assert.equal(result.error, null);
  assert.deepEqual(result.rows, [{ total: 0, present: 0, sum: null, avg: null, min: null, max: null }]);
});

const nullDataset = {
  orders: [{ id: 1, customer_id: null, region: "north", amount: null, status: "paid" }],
  customers: [{ id: null, name: "Unmatched", tier: "pro" }],
};

test("JOIN equality does not match two NULL keys", () => {
  const result = executeSelect("SELECT orders.id AS id FROM orders JOIN customers ON orders.customer_id = customers.id", nullDataset);
  assert.equal(result.error, null);
  assert.deepEqual(result.rows, []);
});

test("all-NULL aggregate groups return COUNT zero and other aggregates NULL", () => {
  const result = executeSelect(`SELECT region, ${aggregates} FROM orders GROUP BY region`, nullDataset);
  assert.equal(result.error, null);
  assert.deepEqual(result.rows, [{ region: "north", total: 1, present: 0, sum: null, avg: null, min: null, max: null }]);
});

for (const operator of ["=", "!=", "<", "<=", ">", ">="]) {
  test(`HAVING excludes NULL aggregate from ${operator} comparison`, () => {
    const result = executeSelect(`SELECT AVG(amount) AS mean FROM orders WHERE amount > 9999 HAVING mean ${operator} 0`);
    assert.equal(result.error, null);
    assert.deepEqual(result.rows, []);
  });
  test(`WHERE excludes NULL scalar subquery from ${operator} comparison`, () => {
    const result = executeSelect(`SELECT id FROM orders WHERE amount ${operator} (SELECT AVG(amount) FROM orders WHERE amount > 9999)`);
    assert.equal(result.error, null);
    assert.deepEqual(result.rows, []);
  });
}

for (const projection of ["missing", "COUNT(missing)", "SUM(missing)", "AVG(missing)", "MIN(missing)", "MAX(missing)"]) {
  test(`empty input still rejects unknown column in ${projection}`, () => {
    assert.ok(executeSelect(`SELECT ${projection} FROM orders WHERE amount > 9999`).error);
  });
}

for (const fn of ["SUM", "AVG", "MIN", "MAX"]) {
  test(`unsupported ${fn}(*) returns an error`, () => {
    assert.ok(executeSelect(`SELECT ${fn}(*) FROM orders WHERE amount > 9999`).error);
  });
}
