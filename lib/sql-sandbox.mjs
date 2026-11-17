export const ordersTable = [
  { id: 1, customer_id: 1, region: "north", amount: 120, status: "paid" },
  { id: 2, customer_id: 2, region: "south", amount: 220, status: "paid" },
  { id: 3, customer_id: 3, region: "central", amount: 90, status: "pending" },
  { id: 4, customer_id: 4, region: "south", amount: 180, status: "pending" },
  { id: 5, customer_id: 5, region: "north", amount: 310, status: "refunded" },
  { id: 6, customer_id: 6, region: "south", amount: 430, status: "paid" },
  { id: 7, customer_id: 7, region: "central", amount: 160, status: "paid" },
  { id: 8, customer_id: 8, region: "north", amount: 75, status: "pending" },
  { id: 9, customer_id: 99, region: "central", amount: 50, status: "pending" },
];

export const customersTable = [
  { id: 1, name: "An", tier: "pro" },
  { id: 2, name: "Binh", tier: "enterprise" },
  { id: 3, name: "Chi", tier: "starter" },
  { id: 4, name: "Dung", tier: "enterprise" },
  { id: 5, name: "Giang", tier: "pro" },
  { id: 6, name: "Hanh", tier: "enterprise" },
  { id: 7, name: "Khanh", tier: "starter" },
  { id: 8, name: "Lan", tier: "starter" },
  { id: 9, name: "Mai", tier: "pro" },
];

const defaultDataset = { orders: ordersTable, customers: customersTable };
const errorResult = (error) => ({ columns: [], rows: [], plan: [], error });
const compare = (left, operator, right) => {
  if (left === null || left === undefined || right === null || right === undefined) return null;
  if (operator === "=") return left === right;
  if (operator === "!=") return left !== right;
  if (operator === ">") return left > right;
  if (operator === "<") return left < right;
  if (operator === ">=") return left >= right;
  if (operator === "<=") return left <= right;
  return false;
};
const qualify = (table, row) => Object.fromEntries(Object.entries(row).map(([column, value]) => [`${table}.${column}`, value]));
const qualifyNull = (table, dataset) => Object.fromEntries(Object.keys(dataset[table][0]).map((column) => [`${table}.${column}`, null]));
const columnCandidates = (row, reference) => {
  const normalized = reference.toLowerCase();
  if (normalized.includes(".")) return Object.hasOwn(row, normalized) ? [normalized] : [];
  return Object.keys(row).filter((column) => column.endsWith(`.${normalized}`));
};
const resolveColumn = (row, reference) => {
  const candidates = columnCandidates(row, reference);
  return candidates.length === 1 ? candidates[0] : null;
};
const parseLiteral = (single, double, number) => number !== undefined ? Number(number) : single ?? double ?? "";

function extractScalarSubqueries(query) {
  const subqueries = [];
  let masked = "";
  for (let index = 0; index < query.length;) {
    if (query[index] !== "(") { masked += query[index]; index += 1; continue; }
    const tail = query.slice(index + 1);
    if (!/^\s*select\b/i.test(tail)) { masked += query[index]; index += 1; continue; }
    let depth = 1;
    let quote = null;
    let cursor = index + 1;
    for (; cursor < query.length; cursor += 1) {
      const character = query[cursor];
      if (quote) {
        if (character === quote && query[cursor - 1] !== "\\") quote = null;
        continue;
      }
      if (character === "'" || character === '"') { quote = character; continue; }
      if (character === "(") depth += 1;
      if (character === ")") depth -= 1;
      if (depth === 0) break;
    }
    if (depth !== 0) return { error: "Subquery chưa đóng ngoặc.", masked: query, subqueries: [] };
    const token = `__subquery_${subqueries.length}__`;
    subqueries.push(query.slice(index + 1, cursor).trim());
    masked += token;
    index = cursor + 1;
  }
  return { error: null, masked, subqueries };
}

function parseProjectionItem(item) {
  const aggregate = item.match(/^(count|sum|avg|min|max)\s*\(\s*(\*|[a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)?)\s*\)(?:\s+as\s+([a-z_][a-z0-9_]*))?$/i);
  if (aggregate) {
    const [, fn, reference, alias] = aggregate;
    return { kind: "aggregate", fn: fn.toLowerCase(), reference: reference.toLowerCase(), alias: (alias ?? `${fn}_${reference.replace(".", "_").replace("*", "rows")}`).toLowerCase() };
  }
  const column = item.match(/^([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)?)(?:\s+as\s+([a-z_][a-z0-9_]*))?$/i);
  if (!column) return null;
  const [, reference, alias] = column;
  return { kind: "column", reference: reference.toLowerCase(), alias: (alias ?? reference.split(".").at(-1)).toLowerCase() };
}

function aggregateValue(fn, reference, group, sampleRow) {
  if (fn === "count" && reference === "*") return group.length;
  const key = resolveColumn(sampleRow, reference);
  if (!key) return undefined;
  const values = group.map((row) => row[key]).filter((value) => value !== null && value !== undefined);
  if (fn === "count") return values.length;
  if (!values.length) return null;
  if (!values.every((value) => typeof value === "number")) return undefined;
  if (fn === "sum") return values.reduce((sum, value) => sum + value, 0);
  if (fn === "avg") return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  if (fn === "min") return values.length ? Math.min(...values) : null;
  if (fn === "max") return values.length ? Math.max(...values) : null;
  return undefined;
}

function executeSelectInternal(rawQuery, depth = 0, dataset = defaultDataset) {
  const query = String(rawQuery ?? "").trim();
  if (query.length > 2_500) return errorResult("Query vượt giới hạn 2.500 ký tự.");
  if (!/^select\b/i.test(query)) return errorResult("Sandbox chỉ cho phép một câu SELECT đọc dữ liệu.");
  if ((query.match(/;/g) ?? []).length > 1 || /;\s*\S/.test(query)) return errorResult("Mỗi lần chỉ chạy một câu SELECT.");
  const normalized = query.replace(/;\s*$/, "").replace(/\s+/g, " ").trim();
  const extracted = extractScalarSubqueries(normalized);
  if (extracted.error) return errorResult(extracted.error);
  if (extracted.subqueries.length > 1) return errorResult("Vertical slice chỉ hỗ trợ một scalar subquery mỗi query.");
  if (depth > 0 && extracted.subqueries.length) return errorResult("Subquery lồng nhiều tầng chưa được hỗ trợ.");
  const subqueryValues = new Map();
  for (let index = 0; index < extracted.subqueries.length; index += 1) {
    const result = executeSelectInternal(extracted.subqueries[index], depth + 1, dataset);
    if (result.error) return errorResult(`Subquery: ${result.error}`);
    if (result.columns.length !== 1 || result.rows.length !== 1) return errorResult("Scalar subquery phải trả đúng một ô dữ liệu.");
    subqueryValues.set(`__subquery_${index}__`, result.rows[0][result.columns[0]]);
  }
  const match = extracted.masked.match(/^select\s+(.+?)\s+from\s+(orders|customers)(?:\s+((?:(?:left|right|full)(?:\s+outer)?|inner)\s+)?join\s+(orders|customers)\s+on\s+([a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*)\s*=\s*([a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*))?(?:\s+where\s+(.+?))?(?:\s+group\s+by\s+(.+?))?(?:\s+having\s+(.+?))?(?:\s+order\s+by\s+([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)?)(?:\s+(asc|desc))?)?(?:\s+limit\s+(\d+))?$/i);
  if (!match) return errorResult("Chưa đọc được query. Dùng SELECT … FROM … rồi thêm JOIN / WHERE / GROUP BY / HAVING / ORDER BY / LIMIT nếu cần.");

  const [, projectionRaw, baseTableRaw, joinTypeRaw, joinTableRaw, joinLeftRaw, joinRightRaw, whereRaw, groupRaw, havingRaw, orderRaw, directionRaw, limitRaw] = match;
  const baseTable = baseTableRaw.toLowerCase();
  const joinTable = joinTableRaw?.toLowerCase();
  if (joinTable && joinTable === baseTable) return errorResult("Vertical slice chỉ JOIN hai bảng orders và customers.");
  let rows = dataset[baseTable].map((row) => qualify(baseTable, row));
  const plan = [`SCAN ${baseTable} (${rows.length} rows)`];

  if (joinTable) {
    const sample = { ...qualify(baseTable, dataset[baseTable][0]), ...qualify(joinTable, dataset[joinTable][0]) };
    const leftKey = resolveColumn(sample, joinLeftRaw);
    const rightKey = resolveColumn(sample, joinRightRaw);
    if (!leftKey || !rightKey || leftKey.split(".")[0] === rightKey.split(".")[0]) return errorResult("JOIN cần nối một cột orders với một cột customers.");
    const joinType = (joinTypeRaw ?? "inner").trim().toLowerCase().replace(/\s+outer$/, "");
    const rightRows = dataset[joinTable].map((row) => qualify(joinTable, row));
    const matchedRight = new Set();
    const joinedRows = [];
    for (const leftRow of rows) {
      const matches = rightRows.map((rightRow, index) => ({ rightRow, index, joined: { ...leftRow, ...rightRow } })).filter((candidate) => compare(candidate.joined[leftKey], "=", candidate.joined[rightKey]) === true);
      if (matches.length) {
        for (const candidate of matches) { matchedRight.add(candidate.index); joinedRows.push(candidate.joined); }
      } else if (joinType === "left" || joinType === "full") {
        joinedRows.push({ ...leftRow, ...qualifyNull(joinTable, dataset) });
      }
    }
    if (joinType === "right" || joinType === "full") {
      rightRows.forEach((rightRow, index) => { if (!matchedRight.has(index)) joinedRows.push({ ...qualifyNull(baseTable, dataset), ...rightRow }); });
    }
    rows = joinedRows;
    plan.push(`${joinType.toUpperCase()} JOIN ${joinTable} → ${rows.length} rows`);
  }

  if (whereRaw) {
    const conditions = whereRaw.split(/\s+and\s+/i).map((part) => {
      const condition = part.trim().match(/^([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)?)\s*(>=|<=|!=|=|>|<)\s*(?:'([^']*)'|"([^"]*)"|(-?\d+(?:\.\d+)?)|(__subquery_\d+__))$/i);
      if (!condition) return null;
      const [, reference, operator, single, double, number, subqueryToken] = condition;
      const fallback = { ...qualify(baseTable, dataset[baseTable][0]), ...(joinTable ? qualify(joinTable, dataset[joinTable][0]) : {}) };
      const key = resolveColumn(rows[0] ?? fallback, reference);
      const value = subqueryToken ? subqueryValues.get(subqueryToken.toLowerCase()) : parseLiteral(single, double, number);
      return key && value !== undefined ? { key, operator, value } : null;
    });
    if (conditions.some((condition) => condition === null)) return errorResult("WHERE hỗ trợ cột hợp lệ, phép so sánh, AND và một scalar aggregate subquery.");
    rows = rows.filter((row) => conditions.every((condition) => compare(row[condition.key], condition.operator, condition.value)));
    plan.push(`FILTER ${conditions.length} condition${conditions.length > 1 ? "s" : ""}${subqueryValues.size ? " + scalar subquery" : ""} → ${rows.length} rows`);
  }

  const sampleRow = rows[0] ?? { ...qualify(baseTable, dataset[baseTable][0]), ...(joinTable ? qualify(joinTable, dataset[joinTable][0]) : {}) };
  const groupReferences = groupRaw ? groupRaw.split(",").map((item) => item.trim().toLowerCase()) : [];
  const groupKeys = groupReferences.map((reference) => resolveColumn(sampleRow, reference));
  if (groupKeys.some((key) => !key)) return errorResult("GROUP BY chứa cột không tồn tại hoặc không rõ bảng.");
  const projectionItems = projectionRaw.trim() === "*" ? null : projectionRaw.split(",").map((item) => parseProjectionItem(item.trim()));
  if (projectionItems?.some((item) => item === null)) return errorResult("SELECT chỉ hỗ trợ cột hoặc COUNT/SUM/AVG/MIN/MAX với alias tùy chọn.");

  let columns;
  let projectedRows;
  if (!projectionItems) {
    if (joinTable || groupKeys.length) return errorResult("SELECT * chỉ dùng cho truy vấn một bảng không GROUP BY.");
    columns = Object.keys(dataset[baseTable][0]);
    projectedRows = rows.map((row) => Object.fromEntries(columns.map((column) => [column, row[`${baseTable}.${column}`]])));
  } else {
    const aliases = projectionItems.map((item) => item.alias);
    if (new Set(aliases).size !== aliases.length) return errorResult("Các cột kết quả cần alias khác nhau.");
    const hasAggregate = projectionItems.some((item) => item.kind === "aggregate");
    if (hasAggregate || groupKeys.length) {
      const groups = new Map();
      for (const row of rows) {
        const key = JSON.stringify(groupKeys.map((groupKey) => row[groupKey]));
        groups.set(key, [...(groups.get(key) ?? []), row]);
      }
      if (!groupKeys.length && !groups.size) groups.set("[]", []);
      for (const item of projectionItems) {
        if (item.kind === "column") {
          const key = resolveColumn(sampleRow, item.reference);
          if (!key || !groupKeys.includes(key)) return errorResult("Cột thường trong SELECT aggregate phải xuất hiện trong GROUP BY.");
        } else if (item.reference === "*" && item.fn !== "count") {
          return errorResult("Chỉ COUNT hỗ trợ đối số *.");
        } else if (item.reference !== "*" && !resolveColumn(sampleRow, item.reference)) {
          return errorResult("Aggregate đang dùng cột không tồn tại hoặc không rõ bảng.");
        }
      }
      projectedRows = [...groups.values()].map((group) => Object.fromEntries(projectionItems.map((item) => {
        if (item.kind === "aggregate") return [item.alias, aggregateValue(item.fn, item.reference, group, sampleRow)];
        const key = resolveColumn(group[0] ?? sampleRow, item.reference);
        return [item.alias, group[0]?.[key]];
      })));
      plan.push(`GROUP ${groupKeys.length ? groupReferences.join(", ") : "all rows"} → ${projectedRows.length} groups`);
    } else {
      if (projectionItems.some((item) => !resolveColumn(sampleRow, item.reference))) return errorResult("SELECT chứa cột không tồn tại hoặc không rõ bảng.");
      projectedRows = rows.map((row) => Object.fromEntries(projectionItems.map((item) => {
        const key = resolveColumn(row, item.reference);
        return [item.alias, key ? row[key] : undefined];
      })));
      if (projectedRows.some((row) => Object.values(row).includes(undefined))) return errorResult("SELECT chứa cột không tồn tại hoặc không rõ bảng.");
    }
    columns = aliases;
  }
  plan.push(`PROJECT ${columns.join(", ")}`);

  if (havingRaw) {
    if (!projectionItems?.some((item) => item.kind === "aggregate")) return errorResult("HAVING cần một aggregate trong SELECT.");
    const conditions = havingRaw.split(/\s+and\s+/i).map((part) => {
      const condition = part.trim().match(/^((?:count|sum|avg|min|max)\s*\(\s*(?:\*|[a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)?)\s*\)|[a-z_][a-z0-9_]*)\s*(>=|<=|!=|=|>|<)\s*(?:'([^']*)'|"([^"]*)"|(-?\d+(?:\.\d+)?))$/i);
      if (!condition) return null;
      const [, operandRaw, operator, single, double, number] = condition;
      const operand = operandRaw.toLowerCase().replace(/\s+/g, "");
      let alias = columns.includes(operand) ? operand : null;
      if (!alias) {
        const aggregate = operand.match(/^(count|sum|avg|min|max)\((\*|[a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)?)\)$/);
        const item = aggregate ? projectionItems.find((candidate) => candidate.kind === "aggregate" && candidate.fn === aggregate[1] && candidate.reference === aggregate[2]) : null;
        alias = item?.alias ?? null;
      }
      return alias ? { alias, operator, value: parseLiteral(single, double, number) } : null;
    });
    if (conditions.some((condition) => condition === null)) return errorResult("HAVING cần dùng alias hoặc aggregate đã có trong SELECT.");
    projectedRows = projectedRows.filter((row) => conditions.every((condition) => compare(row[condition.alias], condition.operator, condition.value)));
    plan.push(`HAVING ${conditions.length} condition${conditions.length > 1 ? "s" : ""} → ${projectedRows.length} groups`);
  }

  if (orderRaw) {
    const orderAlias = orderRaw.toLowerCase().split(".").at(-1);
    if (!columns.includes(orderAlias)) return errorResult("ORDER BY cần dùng một cột hoặc alias có trong kết quả.");
    const direction = (directionRaw ?? "asc").toLowerCase();
    projectedRows.sort((left, right) => {
      if (left[orderAlias] === right[orderAlias]) return 0;
      if (left[orderAlias] === null || left[orderAlias] === undefined) return 1;
      if (right[orderAlias] === null || right[orderAlias] === undefined) return -1;
      const comparison = left[orderAlias] > right[orderAlias] ? 1 : -1;
      return direction === "desc" ? -comparison : comparison;
    });
    plan.push(`SORT ${orderAlias} ${direction.toUpperCase()}`);
  }
  if (limitRaw) {
    const limit = Math.min(100, Number(limitRaw));
    projectedRows = projectedRows.slice(0, limit);
    plan.push(`LIMIT ${limit}`);
  }
  return { columns, rows: projectedRows, plan, error: null };
}

export function executeSelect(rawQuery, dataset = defaultDataset) {
  return executeSelectInternal(rawQuery, 0, dataset);
}

const calibrationDatasets = [
  defaultDataset,
  {
    orders: [
      { id: 21, customer_id: 11, region: "south", amount: 90, status: "paid" },
      { id: 22, customer_id: 12, region: "south", amount: 260, status: "paid" },
      { id: 23, customer_id: 13, region: "north", amount: 500, status: "paid" },
      { id: 24, customer_id: 14, region: "south", amount: 185, status: "pending" },
      { id: 25, customer_id: 999, region: "central", amount: 40, status: "pending" },
    ],
    customers: [
      { id: 11, name: "Nhi", tier: "starter" },
      { id: 12, name: "Oanh", tier: "enterprise" },
      { id: 13, name: "Phuc", tier: "pro" },
      { id: 14, name: "Quynh", tier: "starter" },
      { id: 15, name: "Son", tier: "enterprise" },
    ],
  },
  {
    orders: [
      { id: 31, customer_id: 31, region: "south", amount: 179, status: "paid" },
      { id: 32, customer_id: 32, region: "south", amount: 181, status: "paid" },
      { id: 33, customer_id: 33, region: "south", amount: 480, status: "paid" },
      { id: 34, customer_id: 34, region: "north", amount: 250, status: "refunded" },
      { id: 35, customer_id: 998, region: "central", amount: 75, status: "pending" },
    ],
    customers: [
      { id: 31, name: "Trang", tier: "starter" },
      { id: 32, name: "Uyen", tier: "pro" },
      { id: 33, name: "Vy", tier: "enterprise" },
      { id: 34, name: "Xuan", tier: "pro" },
      { id: 36, name: "Yen", tier: "starter" },
    ],
  },
];

const sameRows = (left, right) => JSON.stringify(left.columns) === JSON.stringify(right.columns)
  && JSON.stringify(left.rows) === JSON.stringify(right.rows);
const gradeAcrossDatasets = (query, referenceQuery) => {
  let fixturesPassed = 0;
  for (const dataset of calibrationDatasets) {
    const actual = executeSelect(query, dataset);
    const expected = executeSelect(referenceQuery, dataset);
    if (!actual.error && !expected.error && sameRows(actual, expected)) fixturesPassed += 1;
  }
  return { passed: fixturesPassed === calibrationDatasets.length, fixturesPassed, fixturesTotal: calibrationDatasets.length };
};

export const gradeSouthOrderQuery = (query) => gradeAcrossDatasets(query, "SELECT id, amount FROM orders WHERE region = 'south' AND amount >= 180 ORDER BY amount DESC");
export const gradeTierRevenueQuery = (query) => gradeAcrossDatasets(query, "SELECT customers.tier, COUNT(*) AS order_count, SUM(orders.amount) AS revenue FROM orders JOIN customers ON orders.customer_id = customers.id WHERE orders.status = 'paid' GROUP BY customers.tier ORDER BY revenue DESC");
export const gradeHavingQuery = (query) => gradeAcrossDatasets(query, "SELECT customers.tier, SUM(orders.amount) AS revenue FROM orders JOIN customers ON orders.customer_id = customers.id WHERE orders.status = 'paid' GROUP BY customers.tier HAVING revenue >= 200 ORDER BY revenue DESC");
export const gradeSubqueryQuery = (query) => gradeAcrossDatasets(query, "SELECT id, amount FROM orders WHERE amount > (SELECT AVG(amount) FROM orders) ORDER BY amount DESC");
export const gradeOuterJoinQuery = (query) => gradeAcrossDatasets(query, "SELECT orders.id AS order_id, customers.name FROM orders FULL OUTER JOIN customers ON orders.customer_id = customers.id ORDER BY order_id ASC");

export function passesSouthOrderChallenge(result) {
  return !result.error && result.columns.join("|") === "id|amount" && result.rows.map((row) => row.id).join("|") === "6|2|4";
}

export function passesTierRevenueChallenge(result) {
  if (result.error || result.rows.length !== 3 || result.columns.length !== 3) return false;
  return result.rows.map((row) => Object.values(row).join("|")).join(";") === "enterprise|2|650;starter|1|160;pro|1|120";
}

export function passesHavingChallenge(result) {
  return !result.error && result.columns.join("|") === "tier|revenue" && result.rows.length === 1 && result.rows[0].tier === "enterprise" && result.rows[0].revenue === 650;
}

export function passesSubqueryChallenge(result) {
  return !result.error && result.columns.join("|") === "id|amount" && result.rows.map((row) => `${row.id}:${row.amount}`).join("|") === "6:430|5:310|2:220";
}

export function passesOuterJoinChallenge(result) {
  if (result.error || result.columns.join("|") !== "order_id|name" || result.rows.length !== 10) return false;
  return result.rows.some((row) => row.order_id === 9 && row.name === null) && result.rows.some((row) => row.order_id === null && row.name === "Mai");
}
