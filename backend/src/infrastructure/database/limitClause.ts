/** 1ページの上限。これを超える値は指定ミスとみなす。 */
const MAX_LIMIT = 1000;

/**
 * `LIMIT`句をSQLへ直接埋め込む形で組み立てる。
 *
 * `LIMIT ?`はプレースホルダで渡せない。mysql2はJavaScriptの数値をDOUBLEで送るためMySQLが
 * 拒否し、文字列にするとTiDBが`Incorrect arguments to LIMIT`で拒否する。両方で動く形が無い。
 *
 * 埋め込む値は正の整数であることを検証してからしか通さないため、SQLインジェクションにならない。
 */
export function limitClause(limit: number): string {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new RangeError(`limit must be an integer in 1..${MAX_LIMIT}.`);
  }

  return `LIMIT ${String(limit)}`;
}
