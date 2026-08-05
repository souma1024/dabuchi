import { describe, expect, it } from 'vitest';

import { createCurrentUser } from '../../test/factories/currentUserFactory.js';
import { createMysqlPool } from '../../test/factories/mysqlPoolFactory.js';
import { MysqlCurrentUserRepository } from './mysqlCurrentUserRepository.js';

const MOCK_USER_ID = 'friend-001';

describe('MysqlCurrentUserRepository', () => {
  it('公開ユーザーIDからホーム表示用の4項目を取得する', async () => {
    const user = createCurrentUser();
    const { pool, execute } = createMysqlPool([[user]]);
    const repository = new MysqlCurrentUserRepository(pool);

    await expect(repository.findByUserId(MOCK_USER_ID)).resolves.toEqual(user);
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('BIN_TO_UUID(id) AS id'),
      [MOCK_USER_ID],
    );
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('WHERE user_id = ?'),
      [MOCK_USER_ID],
    );
  });

  it('ユーザーが存在しなければnullを返す', async () => {
    const { pool } = createMysqlPool([[]]);
    const repository = new MysqlCurrentUserRepository(pool);

    await expect(repository.findByUserId(MOCK_USER_ID)).resolves.toBeNull();
  });
});
