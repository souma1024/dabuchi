import { describe, expect, it } from 'vitest';

import { createMysqlPool } from '../../test/factories/mysqlPoolFactory.js';
import { createUserRecipientRecord } from '../../test/factories/userRecipientFactory.js';
import { MysqlUserRecipientRepository } from './mysqlUserRecipientRepository.js';

const CURRENT_USER_ID = '11111111-1111-4111-8111-111111111111';

describe('MysqlUserRecipientRepository', () => {
  it('内部UUIDで現在ユーザーの存在を確認する', async () => {
    const { pool, execute } = createMysqlPool([[{ found: 1 }]]);
    const repository = new MysqlUserRecipientRepository(pool);

    await expect(repository.existsById(CURRENT_USER_ID)).resolves.toBe(true);
    expect(execute).toHaveBeenCalledWith(
      'SELECT 1 AS found FROM users WHERE id = UUID_TO_BIN(?) LIMIT 1',
      [CURRENT_USER_ID],
    );
  });

  it('現在ユーザーを除外し、表示件数より1件多く作成順で取得する', async () => {
    const record = createUserRecipientRecord();
    const { pool, execute } = createMysqlPool([[record]]);
    const repository = new MysqlUserRecipientRepository(pool);

    await expect(
      repository.findRecipients({
        currentUserId: CURRENT_USER_ID,
        cursor: null,
        limit: 21,
      }),
    ).resolves.toEqual([record]);
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('WHERE id <> UUID_TO_BIN(?)'),
      [CURRENT_USER_ID, 21],
    );
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY created_at ASC, id ASC'),
      [CURRENT_USER_ID, 21],
    );
  });

  it('次ページでは作成日時と内部UUIDをカーソル条件にする', async () => {
    const { pool, execute } = createMysqlPool([[]]);
    const repository = new MysqlUserRecipientRepository(pool);
    const cursor = {
      createdAt: '2026-08-04 12:00:20.000000',
      id: '00000000-0000-4000-8000-000000000020',
    };

    await repository.findRecipients({
      currentUserId: CURRENT_USER_ID,
      cursor,
      limit: 21,
    });

    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('created_at > ?'),
      [CURRENT_USER_ID, cursor.createdAt, cursor.createdAt, cursor.id, 21],
    );
  });
});
