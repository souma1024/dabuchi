import type { ResultSetHeader } from 'mysql2';
import type { Pool } from 'mysql2/promise';

import type {
  NewTransfer,
  SavedTransfer,
  TransferRepository,
} from '../domain/transferRepository.js';

export class MysqlTransferRepository implements TransferRepository {
  constructor(private readonly pool: Pool) {}

  async save(transfer: NewTransfer): Promise<SavedTransfer> {
    const [result] = await this.pool.execute<ResultSetHeader>(
      'INSERT INTO transfers (user_id, amount) VALUES (?, ?)',
      [transfer.userId, transfer.amount],
    );

    return { id: result.insertId, ...transfer };
  }
}
