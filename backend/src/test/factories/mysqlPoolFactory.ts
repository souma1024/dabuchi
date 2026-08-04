import type { Pool } from 'mysql2/promise';
import { vi } from 'vitest';

export function createMysqlPool(resultSets: readonly unknown[][]) {
  const pendingResultSets = [...resultSets];
  const execute = vi.fn(() =>
    Promise.resolve([pendingResultSets.shift() ?? [], []] as const),
  );
  const pool = { execute } as unknown as Pool;

  return { pool, execute };
}
