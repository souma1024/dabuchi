import { createPool, type Pool } from 'mysql2/promise';

import type { DatabaseConfig } from './databaseConfig.js';

export function createDatabasePool(config: DatabaseConfig): Pool {
  const pool = createPool({
    ...config,
    connectionLimit: 5,
    dateStrings: true,
  });

  // 物理コネクションごとにセッション time_zone を UTC(+00:00) へ固定する。
  // transfers.created_at は DEFAULT CURRENT_TIMESTAMP(6) で保存されるため、
  // サーバ既定TZ(JST等)に依存すると保存・読み取りでUTCがずれる。数値オフセットは
  // tzテーブル不要で常に有効。mysql2はコネクション単位でコマンドを直列化するため、
  // この SET は払い出し後の最初のクエリより必ず先に実行される。
  // 固定に失敗したコネクションは破棄し、プールに再作成させる。
  pool.on('connection', (connection) => {
    void connection.query("SET time_zone = '+00:00'").catch(() => {
      connection.destroy();
    });
  });

  return pool;
}
