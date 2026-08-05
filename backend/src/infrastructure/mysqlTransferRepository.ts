import type { ResultSetHeader } from 'mysql2';
import type { Pool } from 'mysql2/promise';

import { TransferParticipantNotFoundError } from '../application/createTransfer.js';
import type {
  NewTransfer,
  SavedTransfer,
  TransferRepository,
} from '../domain/transferRepository.js';

export class MysqlTransferRepository implements TransferRepository {
  constructor(private readonly pool: Pool) {}

  async save(transfer: NewTransfer): Promise<SavedTransfer> {
    let result: ResultSetHeader;

    try {
      [result] = await this.pool.execute<ResultSetHeader>(
        `INSERT INTO transfers (sender_id, recipient_id, amount)
         VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), ?)`,
        [transfer.senderId, transfer.recipientId, transfer.amount],
      );
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new TransferParticipantNotFoundError();
      }

      throw error;
    }

    return { id: result.insertId, ...transfer };
  }
}

function isForeignKeyViolation(error: unknown): error is { code: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ER_NO_REFERENCED_ROW_2'
  );
}
