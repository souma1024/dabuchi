import { describe, expect, it } from 'vitest';

import { TransferParticipantNotFoundError } from '../application/createTransfer.js';
import { createMysqlPool } from '../test/factories/mysqlPoolFactory.js';
import { MysqlTransferRepository } from './mysqlTransferRepository.js';

describe('MysqlTransferRepository', () => {
  it('送金を保存する', async () => {
    const transfer = {
      senderId: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001',
      recipientId: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf002',
      amount: 1500,
    };
    const { pool, execute } = createMysqlPool([{ insertId: 42 }]);
    const repository = new MysqlTransferRepository(pool);

    await expect(repository.save(transfer)).resolves.toEqual({
      id: 42,
      ...transfer,
    });
    expect(execute).toHaveBeenCalledWith(
      `INSERT INTO transfers (sender_id, recipient_id, amount)
         VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), ?)`,
      [transfer.senderId, transfer.recipientId, transfer.amount],
    );
  });

  it('外部キー違反をapplication errorへ変換する', async () => {
    const error = new Error('foreign key violation') as Error & {
      code: string;
    };
    error.code = 'ER_NO_REFERENCED_ROW_2';
    const transfer = {
      senderId: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001',
      recipientId: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf999',
      amount: 1500,
    };
    const { pool, execute } = createMysqlPool([error]);
    const repository = new MysqlTransferRepository(pool);

    await expect(repository.save(transfer)).rejects.toBeInstanceOf(
      TransferParticipantNotFoundError,
    );
    expect(execute).toHaveBeenCalledWith(
      `INSERT INTO transfers (sender_id, recipient_id, amount)
         VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), ?)`,
      [transfer.senderId, transfer.recipientId, transfer.amount],
    );
  });
});
