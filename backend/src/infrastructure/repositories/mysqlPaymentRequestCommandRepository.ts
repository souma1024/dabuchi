import type { ResultSetHeader } from 'mysql2';
import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';

import {
  PaymentRequestAlreadyRespondedError,
  PaymentRequestForbiddenError,
  PaymentRequestNotFoundError,
} from '../../application/errors/paymentRequestCommandErrors.js';
import type {
  PaymentRequestCommandRepository,
  RespondToPaymentRequestInput,
  RespondedPaymentRequest,
} from '../../application/ports/paymentRequestCommandRepository.js';
import { applyMoneyTransfer } from '../applyMoneyTransfer.js';
import { isTransientTransactionError } from '../database/mysqlError.js';

// デッドロック・ロック待ちタイムアウト時にトランザクション全体を試行する上限。
// MysqlTransferRepository と揃える。
const MAX_TRANSACTION_ATTEMPTS = 3;

interface PaymentRequestRow extends RowDataPacket {
  id: string;
  requesterId: string;
  recipientId: string;
  amount: number;
  status: string;
}

interface RespondedRow extends RowDataPacket {
  respondedAt: string;
}

interface BalanceRow extends RowDataPacket {
  balance: number;
}

export class MysqlPaymentRequestCommandRepository
  implements PaymentRequestCommandRepository
{
  constructor(private readonly pool: Pool) {}

  async respond(
    input: RespondToPaymentRequestInput,
  ): Promise<RespondedPaymentRequest> {
    for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
      const connection = await this.pool.getConnection();

      try {
        return await this.runInTransaction(connection, input);
      } catch (error) {
        await rollbackQuietly(connection);

        if (
          isTransientTransactionError(error) &&
          attempt < MAX_TRANSACTION_ATTEMPTS
        ) {
          continue;
        }

        throw error;
      } finally {
        connection.release();
      }
    }

    // ループは必ず return / throw / continue で抜ける。到達しない。
    throw new Error(
      'payment request transaction retry loop exited unexpectedly.',
    );
  }

  private async runInTransaction(
    connection: PoolConnection,
    input: RespondToPaymentRequestInput,
  ): Promise<RespondedPaymentRequest> {
    await connection.beginTransaction();

    // 状態と権限を確認してから更新するまでの間に別の実行が割り込むと二重送金に
    // なるため、対象行をロックしてから読む。
    const [rows] = await connection.execute<PaymentRequestRow[]>(
      `SELECT BIN_TO_UUID(id) AS id,
              BIN_TO_UUID(requester_id) AS requesterId,
              BIN_TO_UUID(recipient_id) AS recipientId,
              amount,
              status
         FROM payment_requests
        WHERE id = UUID_TO_BIN(?)
        FOR UPDATE`,
      [input.paymentRequestId],
    );

    const paymentRequest = rows[0];

    if (!paymentRequest) {
      throw new PaymentRequestNotFoundError();
    }

    if (
      paymentRequest.recipientId.toLowerCase() !==
      input.currentUserInternalId.toLowerCase()
    ) {
      throw new PaymentRequestForbiddenError();
    }

    if (paymentRequest.status !== 'pending') {
      throw new PaymentRequestAlreadyRespondedError();
    }

    const amount = Number(paymentRequest.amount);

    // 承認のときだけ残高が動く。送金APIと同じ手続きを再利用し、
    // 残高検証・双方の更新・transfers への記録を同じtransactionで行う。
    // 被請求者が支払い、請求者が受け取る。
    if (input.response === 'accepted') {
      await applyMoneyTransfer(connection, {
        payerId: paymentRequest.recipientId,
        payeeId: paymentRequest.requesterId,
        amount,
      });
    }

    const [updateResult] = await connection.execute<ResultSetHeader>(
      `UPDATE payment_requests
          SET status = ?, responded_at = CURRENT_TIMESTAMP(6)
        WHERE id = UUID_TO_BIN(?) AND status = 'pending'`,
      [input.response, input.paymentRequestId],
    );

    // FOR UPDATE で保護しているため通常は起こらない。想定が崩れた場合に
    // 残高だけ動いた状態でcommitしないよう、ここで打ち切る。
    if (updateResult.affectedRows !== 1) {
      throw new PaymentRequestAlreadyRespondedError();
    }

    const [respondedRows] = await connection.execute<RespondedRow[]>(
      `SELECT DATE_FORMAT(responded_at, '%Y-%m-%d %H:%i:%s.%f') AS respondedAt
         FROM payment_requests
        WHERE id = UUID_TO_BIN(?)`,
      [input.paymentRequestId],
    );

    const respondedAt = respondedRows[0]?.respondedAt;

    if (respondedAt === undefined) {
      throw new PaymentRequestNotFoundError();
    }

    const recipientBalance =
      input.response === 'accepted'
        ? await readBalance(connection, paymentRequest.recipientId)
        : null;

    await connection.commit();

    return {
      id: paymentRequest.id,
      amount,
      status: input.response,
      respondedAt,
      recipientBalance,
    };
  }
}

async function readBalance(
  connection: PoolConnection,
  userInternalId: string,
): Promise<number> {
  const [rows] = await connection.execute<BalanceRow[]>(
    `SELECT balance FROM users WHERE id = UUID_TO_BIN(?)`,
    [userInternalId],
  );

  return Number(rows[0]?.balance ?? 0);
}

async function rollbackQuietly(connection: PoolConnection): Promise<void> {
  try {
    await connection.rollback();
  } catch {
    // rollback自体の失敗は握りつぶす。壊れたコネクションはプール返却時に破棄される。
    // 呼び出し側へは元の原因エラーを伝える。
  }
}
