import { createPool, type Pool } from 'mysql2/promise';

import type { DatabaseConfig } from './databaseConfig.js';

export function createDatabasePool(config: DatabaseConfig): Pool {
  return createPool({
    ...config,
    connectionLimit: 5,
    dateStrings: true,
  });
}
