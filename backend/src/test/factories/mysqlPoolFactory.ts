import type { Pool } from 'mysql2/promise';
import { vi } from 'vitest';

type MysqlExecuteResult = unknown;

export function createMysqlPool(results: readonly MysqlExecuteResult[]) {
  const pendingResults = [...results];
  const execute = vi.fn(() => {
    const nextResult = pendingResults.shift() ?? [];

    if (nextResult instanceof Error) {
      return Promise.reject(nextResult);
    }

    return Promise.resolve([nextResult, []] as const);
  });
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
