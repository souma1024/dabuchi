import type { Pool, PoolConnection } from 'mysql2/promise';
import { vi } from 'vitest';

type MysqlExecuteResult = unknown;

// 呼び出し時の (sql, params) を .mock.calls で検証できるよう、引数を受ける関数型にする。
type ExecuteMock = (...args: unknown[]) => Promise<[unknown, unknown[]]>;

function createResultRunner(
  results: readonly MysqlExecuteResult[],
): ExecuteMock {
  const pendingResults = [...results];
  return () => {
    const nextResult = pendingResults.shift() ?? [];

    if (nextResult instanceof Error) {
      return Promise.reject(nextResult);
    }

    return Promise.resolve([nextResult, []]);
  };
}

export function createMysqlPool(results: readonly MysqlExecuteResult[]) {
  const execute = vi.fn(createResultRunner(results));
  const pool = { execute } as unknown as Pool;

  return { pool, execute };
}

/**
 * `pool.getConnection()` でトランザクション用コネクションを払い出すpoolのモック。
 * `execute` は `results` を順に返す（`Error` を渡すと reject）。
 * `beginTransaction` / `commit` / `rollback` / `release` は spy として検証できる。
 */
export function createTransactionalMysqlPool(
  results: readonly MysqlExecuteResult[],
) {
  const execute = vi.fn(createResultRunner(results));
  const beginTransaction = vi.fn(() => Promise.resolve());
  const commit = vi.fn(() => Promise.resolve());
  const rollback = vi.fn(() => Promise.resolve());
  const release = vi.fn();
  const connection = {
    execute,
    beginTransaction,
    commit,
    rollback,
    release,
  } as unknown as PoolConnection;
  const getConnection = vi.fn(() => Promise.resolve(connection));
  const pool = { getConnection } as unknown as Pool;

  return {
    pool,
    connection,
    getConnection,
    execute,
    beginTransaction,
    commit,
    rollback,
    release,
  };
}
