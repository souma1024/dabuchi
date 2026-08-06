import { describe, expect, it } from 'vitest';

import { createMysqlPool } from '../../test/factories/mysqlPoolFactory.js';
import { createTransactionRecord } from '../../test/factories/transactionFactory.js';
import { MysqlTransactionRepository } from './mysqlTransactionRepository.js';

const CURRENT_USER_ID = '11111111-1111-4111-8111-111111111111';

describe('MysqlTransactionRepository', () => {
  it('内部UUIDで現在ユーザーの存在を確認する', async () => {
    const { pool, execute } = createMysqlPool([[{ found: 1 }]]);
    const repository = new MysqlTransactionRepository(pool);

    await expect(repository.existsById(CURRENT_USER_ID)).resolves.toBe(true);
    expect(execute).toHaveBeenCalledWith(
      'SELECT 1 AS found FROM users WHERE id = UUID_TO_BIN(?) LIMIT 1',
      [CURRENT_USER_ID],
    );
  });

  it('送受金を統合し、表示件数より1件多く新しい順で取得する', async () => {
    const record = createTransactionRecord();
    const { pool, execute } = createMysqlPool([[record]]);
    const repository = new MysqlTransactionRepository(pool);

    await expect(
      repository.findTransactions({
        currentUserId: CURRENT_USER_ID,
        cursor: null,
        limit: 21,
      }),
    ).resolves.toEqual([record]);
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining(
        'WHERE (t.sender_id = UUID_TO_BIN(?) OR t.recipient_id = UUID_TO_BIN(?))',
      ),
      [
        CURRENT_USER_ID,
        CURRENT_USER_ID,
        CURRENT_USER_ID,
        CURRENT_USER_ID,
        CURRENT_USER_ID,
        '21',
      ],
    );
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY t.created_at DESC, t.id DESC'),
      expect.anything(),
    );
  });

  it('次ページでは作成日時と取引IDをカーソル条件にする', async () => {
    const { pool, execute } = createMysqlPool([[]]);
    const repository = new MysqlTransactionRepository(pool);
    const cursor = {
      createdAt: '2026-08-04 12:00:20.000000',
      id: '20',
    };

    await repository.findTransactions({
      currentUserId: CURRENT_USER_ID,
      cursor,
      limit: 21,
    });

    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('t.created_at < ?'),
      [
        CURRENT_USER_ID,
        CURRENT_USER_ID,
        CURRENT_USER_ID,
        CURRENT_USER_ID,
        CURRENT_USER_ID,
        cursor.createdAt,
        cursor.createdAt,
        cursor.id,
        '21',
      ],
    );
  });
});
