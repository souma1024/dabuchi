import { createPool, type Pool } from 'mysql2/promise';

import type { DatabaseConfig } from './databaseConfig.js';

// mysql2 の 'connection' イベントが渡す生コネクションの最小形。
// promise.d.ts は Promise 版 PoolConnection を型付けするが、inheritEvents は
// コアプールのコールバック方式コネクションをそのまま透過するため実体は異なる。
interface RawConnection {
  query: (sql: string, callback: (error: unknown) => void) => void;
  destroy: () => void;
}

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
    const raw = connection as unknown as RawConnection;
    raw.query("SET time_zone = '+00:00'", (error) => {
      if (error) {
        raw.destroy();
      }
    });
  });

  return pool;
}
