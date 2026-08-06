import type { Pool, RowDataPacket } from 'mysql2/promise';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createDatabasePool } from '../database/createDatabasePool.js';
import { loadDatabaseConfig } from '../database/databaseConfig.js';
import { MysqlTransactionRepository } from './mysqlTransactionRepository.js';

// 実MySQL(Docker)に対して取引履歴SQLを検証する結合テスト。
// 通常の `npm test` / CI では RUN_DB_INTEGRATION が未設定のためスキップされる。
// 実行手順:
//   docker compose up -d --wait mysql && docker compose run --rm migrate
//   RUN_DB_INTEGRATION=1 MYSQL_HOST=127.0.0.1 MYSQL_PORT=3306 \
//     MYSQL_DATABASE=... MYSQL_USER=... MYSQL_PASSWORD=... \
//     npx vitest run src/infrastructure/repositories/mysqlTransactionRepository.integration.test.ts
const shouldRun = process.env.RUN_DB_INTEGRATION === '1';

const USER_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ABSENT_USER = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const SAME_TIME = '2026-08-04 12:00:20.000000';
const EARLIER_TIME = '2026-08-04 12:00:10.000000';

interface TimeZoneRow extends RowDataPacket {
  tz: string;
}

async function cleanup(pool: Pool): Promise<void> {
  await pool.query(
    `DELETE FROM transfers
     WHERE sender_id IN (UUID_TO_BIN(?), UUID_TO_BIN(?))
        OR recipient_id IN (UUID_TO_BIN(?), UUID_TO_BIN(?))`,
    [USER_A, USER_B, USER_A, USER_B],
  );
  await pool.query(
    'DELETE FROM users WHERE id IN (UUID_TO_BIN(?), UUID_TO_BIN(?))',
    [USER_A, USER_B],
  );
}

async function seed(pool: Pool): Promise<void> {
  const insertUser =
    'INSERT INTO users (id, user_id, balance, user_name, profile_url) VALUES (UUID_TO_BIN(?), ?, 0, ?, ?)';
  await pool.query(insertUser, [
    USER_A,
    'it-user-a',
    'IT ユーザーA',
    '/assets/profiles/human1.png',
  ]);
  await pool.query(insertUser, [
    USER_B,
    'it-user-b',
    'IT ユーザーB',
    '/assets/profiles/human2.png',
  ]);

  const insertTransfer =
    'INSERT INTO transfers (sender_id, recipient_id, amount, created_at) VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), ?, ?)';
  // 送金(A -> B), 古い時刻
  await pool.query(insertTransfer, [USER_A, USER_B, 500, EARLIER_TIME]);
  // 送金(A -> B), 同一時刻
  await pool.query(insertTransfer, [USER_A, USER_B, 1500, SAME_TIME]);
  // 受取(B -> A), 同一時刻（最後に挿入 = 最大のid）
  await pool.query(insertTransfer, [USER_B, USER_A, 2500, SAME_TIME]);
}

describe.skipIf(!shouldRun)('MysqlTransactionRepository (integration)', () => {
  let pool: Pool;
  let repository: MysqlTransactionRepository;

  beforeAll(async () => {
    pool = createDatabasePool(loadDatabaseConfig(process.env));
    await cleanup(pool);
    await seed(pool);
    repository = new MysqlTransactionRepository(pool);
  });

  afterAll(async () => {
    await cleanup(pool);
    await pool.end();
  });

  it('プールのセッションtime_zoneがUTC(+00:00)に固定されている', async () => {
    const [rows] = await pool.query<TimeZoneRow[]>(
      'SELECT @@session.time_zone AS tz',
    );

    expect(rows[0]?.tz).toBe('+00:00');
  });

  it('内部UUIDで現在ユーザーの存在を判定する', async () => {
    await expect(repository.existsById(USER_A)).resolves.toBe(true);
    await expect(repository.existsById(ABSENT_USER)).resolves.toBe(false);
  });

  it('両方向のcounterparty/directionを解決し、新しい順・同一日時はid DESCで返す', async () => {
    const result = await repository.findTransactions({
      currentUserId: USER_A,
      cursor: null,
      limit: 21,
    });

    expect(result).toHaveLength(3);
    const [firstRow, secondRow, thirdRow] = result;
    if (!firstRow || !secondRow || !thirdRow) {
      throw new Error('expected three transactions');
    }

    // 受取(B -> A): counterparty は sender=B を JOIN で解決する
    expect(firstRow.direction).toBe('received');
    expect(firstRow.counterpartyId).toBe(USER_B);
    expect(firstRow.counterpartyName).toBe('IT ユーザーB');
    expect(firstRow.counterpartyProfileUrl).toBe('/assets/profiles/human2.png');
    expect(firstRow.amount).toBe(2500);
    expect(firstRow.createdAt).toBe(SAME_TIME);
    expect(typeof firstRow.id).toBe('string');

    // 送金(A -> B): counterparty は recipient=B を JOIN で解決する
    expect(secondRow.direction).toBe('sent');
    expect(secondRow.counterpartyId).toBe(USER_B);
    expect(secondRow.amount).toBe(1500);
    expect(secondRow.createdAt).toBe(SAME_TIME);

    // 同一 created_at では id DESC（後挿入=大きいidが先頭）
    expect(BigInt(firstRow.id) > BigInt(secondRow.id)).toBe(true);

    // より古い created_at は後ろ
    expect(thirdRow.direction).toBe('sent');
    expect(thirdRow.amount).toBe(500);
    expect(thirdRow.createdAt).toBe(EARLIER_TIME);
  });

  it('カーソル以降のみを返す（created_at=かつid<、およびcreated_at<の両分岐）', async () => {
    const firstPage = await repository.findTransactions({
      currentUserId: USER_A,
      cursor: null,
      limit: 21,
    });
    const head = firstPage[0];
    if (!head) {
      throw new Error('expected at least one transaction');
    }

    const nextPage = await repository.findTransactions({
      currentUserId: USER_A,
      cursor: { createdAt: head.createdAt, id: head.id },
      limit: 21,
    });

    expect(nextPage).toHaveLength(2);
    const [next0, next1] = nextPage;
    if (!next0 || !next1) {
      throw new Error('expected two transactions');
    }
    // 同一 created_at で id < head.id の行
    expect(next0.amount).toBe(1500);
    expect(next0.direction).toBe('sent');
    // created_at < head.createdAt の行
    expect(next1.amount).toBe(500);
  });
});
