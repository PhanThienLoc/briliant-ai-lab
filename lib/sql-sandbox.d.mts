/** Public contract of the bounded, read-only SQL simulator. */
export type SqlValue = string | number | null | undefined;
export type SqlRow = Record<string, SqlValue>;
export type SqlDataset = { orders: SqlRow[]; customers: SqlRow[] };
export type SqlResult = { columns: string[]; rows: SqlRow[]; plan: string[]; error: string | null };
export type SqlGrade = { passed: boolean; fixturesPassed: number; fixturesTotal: number };
export const ordersTable: { id: number; customer_id: number; region: string; amount: number; status: string }[];
export const customersTable: { id: number; name: string; tier: string }[];
export function executeSelect(rawQuery: unknown, dataset?: SqlDataset): SqlResult;
export function gradeSouthOrderQuery(query: string): SqlGrade;
export function gradeTierRevenueQuery(query: string): SqlGrade;
export function gradeHavingQuery(query: string): SqlGrade;
export function gradeSubqueryQuery(query: string): SqlGrade;
export function gradeOuterJoinQuery(query: string): SqlGrade;

export function passesSouthOrderChallenge(result: SqlResult): boolean;
export function passesTierRevenueChallenge(result: SqlResult): boolean;
export function passesHavingChallenge(result: SqlResult): boolean;
export function passesSubqueryChallenge(result: SqlResult): boolean;
export function passesOuterJoinChallenge(result: SqlResult): boolean;
