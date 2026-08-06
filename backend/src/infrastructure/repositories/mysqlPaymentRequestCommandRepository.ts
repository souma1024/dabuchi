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
  /** pendingのあいだはnull。 */
  respondedAt: string | null;
}

interface RespondedRow extends RowDataPacket {
  respondedAt: string;
}

interface BalanceRow extends RowDataPacket {
  balance: number;
}

export class MysqlPaymentRequestCommandRepository implements PaymentRequestCommandRepository {
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
              status,
              DATE_FORMAT(responded_at, '%Y-%m-%d %H:%i:%s.%f') AS respondedAt
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

    const amount = Number(paymentRequest.amount);

    if (paymentRequest.status !== 'pending') {
      // 同じ向きの応答が確定済みなら、冪等リプレイとして現在の結果を返す。
      // COMMITはMySQL側で完了したのに応答が届かず、clientが再送する場合がある。
      // 409のままだと「失敗表示なのにお金は動いた」状態から成功へ収束できない。
      // 逆向き（accepted済みへreject等）は取り消しにあたるため409のままにする。
      if (paymentRequest.status !== input.response) {
        throw new PaymentRequestAlreadyRespondedError();
      }

      return this.replayResponse(connection, paymentRequest, amount, input);
    }

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

  /**
   * 既に同じ向きで確定している請求の結果を、何も変えずに返す。
   *
   * 残高は動かさない。返す残高は現時点の値で、承認直後の値とは限らない
   * （その後に別の送金があれば変わる）。clientが必要とするのは
   * 「いま画面に出す残高」なので、これで問題ない。
   */
  private async replayResponse(
    connection: PoolConnection,
    paymentRequest: PaymentRequestRow,
    amount: number,
    input: RespondToPaymentRequestInput,
  ): Promise<RespondedPaymentRequest> {
    // CHECK制約 chk_payment_requests_response_time により、pending以外は
    // responded_at が必ず入っている。取れないならDBの不変条件が壊れている。
    if (paymentRequest.respondedAt === null) {
      throw new Error(
        `Payment request ${paymentRequest.id} is ${paymentRequest.status} but has no responded_at.`,
      );
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
      respondedAt: paymentRequest.respondedAt,
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
  const row = rows[0];

  // 直前にFOR UPDATEでロックしているため通常は起こらない。
  // 残高0と偽って成功を返すより、不変条件違反として500にする。
  if (!row) {
    throw new Error(`User ${userInternalId} disappeared during the response.`);
  }

  return Number(row.balance);
}

async function rollbackQuietly(connection: PoolConnection): Promise<void> {
  try {
    await connection.rollback();
  } catch {
    // rollback自体の失敗は握りつぶす。壊れたコネクションはプール返却時に破棄される。
    // 呼び出し側へは元の原因エラーを伝える。
  }
}
