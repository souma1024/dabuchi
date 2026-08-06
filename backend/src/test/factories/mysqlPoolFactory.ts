import type { Pool } from 'mysql2/promise';
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

// pool.execute と pool.getConnection() の双方を備えたモック。
// getConnection() は beginTransaction / commit / rollback / release を持つコネクションを返すため、
// トランザクションを張るリポジトリのテストにも使える。
export function createMysqlPool(results: readonly MysqlExecuteResult[]) {
  const execute = vi.fn(createResultRunner(results));
  const connection = {
    execute,
    beginTransaction: vi.fn().mockResolvedValue(undefined),
    commit: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined),
    release: vi.fn(),
  };
  const getConnection = vi.fn().mockResolvedValue(connection);
  const pool = { execute, getConnection } as unknown as Pool;

  return { pool, execute, connection, getConnection };
}
