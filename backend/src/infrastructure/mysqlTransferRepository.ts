import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';

import type {
  NewTransfer,
  SavedTransfer,
  TransferRepository,
} from '../domain/transferRepository.js';
import { applyMoneyTransfer } from './applyMoneyTransfer.js';
import {
  isDuplicateKeyViolation,
  isTransientTransactionError,
} from './database/mysqlError.js';

// デッドロック・ロック待ちタイムアウト時にトランザクション全体を試行する上限。
const MAX_TRANSACTION_ATTEMPTS = 3;

interface ExistingTransferRow extends RowDataPacket {
  id: number;
  senderId: string;
  recipientId: string;
  amount: number;
}

export class MysqlTransferRepository implements TransferRepository {
  constructor(private readonly pool: Pool) {}

  async save(transfer: NewTransfer): Promise<SavedTransfer> {
    for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
      const connection = await this.pool.getConnection();

      try {
        return await this.runInTransaction(connection, transfer);
      } catch (error) {
        await rollbackQuietly(connection);

        if (
          isTransientTransactionError(error) &&
          attempt < MAX_TRANSACTION_ATTEMPTS
        ) {
          continue;
        }

        // 同一キーで同時実行され、INSERTが一意制約で弾かれた場合は先勝ちの結果を返す。
        if (
          isDuplicateKeyViolation(error) &&
          transfer.idempotencyKey !== undefined
        ) {
          const existing = await this.findByIdempotencyKey(
            connection,
            transfer.idempotencyKey,
          );
          if (existing) {
            return existing;
          }
        }

        throw error;
      } finally {
        connection.release();
      }
    }

    // ループは必ず return / throw / continue で抜ける。到達しない。
    throw new Error('transfer transaction retry loop exited unexpectedly.');
  }

  private async runInTransaction(
    connection: PoolConnection,
    transfer: NewTransfer,
  ): Promise<SavedTransfer> {
    await connection.beginTransaction();

    // 既に同一キーで確定済みなら、残高を動かさずその結果を返す（冪等リプレイ）。
    if (transfer.idempotencyKey !== undefined) {
      const existing = await this.findByIdempotencyKey(
        connection,
        transfer.idempotencyKey,
      );
      if (existing) {
        await connection.commit();
        return existing;
      }
    }

    const applied = await applyMoneyTransfer(connection, {
      payerId: transfer.senderId,
      payeeId: transfer.recipientId,
      amount: transfer.amount,
      idempotencyKey: transfer.idempotencyKey,
    });

    await connection.commit();

    return {
      id: applied.id,
      senderId: applied.payerId,
      recipientId: applied.payeeId,
      amount: applied.amount,
    };
  }

  private async findByIdempotencyKey(
    connection: PoolConnection,
    idempotencyKey: string,
  ): Promise<SavedTransfer | null> {
    const [rows] = await connection.execute<ExistingTransferRow[]>(
      `SELECT id,
              BIN_TO_UUID(sender_id) AS senderId,
              BIN_TO_UUID(recipient_id) AS recipientId,
              amount
         FROM transfers
        WHERE idempotency_key = ?
        LIMIT 1`,
      [idempotencyKey],
    );

    const row = rows[0];
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      senderId: row.senderId,
      recipientId: row.recipientId,
      amount: row.amount,
    };
  }
}

async function rollbackQuietly(connection: PoolConnection): Promise<void> {
  try {
    await connection.rollback();
  } catch {
    // rollback自体の失敗は握りつぶす。壊れたコネクションはプール返却時に破棄される。
    // 呼び出し側へは元の原因エラーを伝える。
  }
}
