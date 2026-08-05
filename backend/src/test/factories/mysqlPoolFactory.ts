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
  const pool = { execute } as unknown as Pool;

  return { pool, execute };
}
