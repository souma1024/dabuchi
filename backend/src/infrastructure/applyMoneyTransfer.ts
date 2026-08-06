import type { ResultSetHeader } from 'mysql2';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';

import {
  InsufficientBalanceError,
  TransferParticipantNotFoundError,
} from '../application/createTransfer.js';

export interface MoneyTransferInput {
  // 支払う側（残高が減る）の内部UUID。
  payerId: string;
  // 受け取る側（残高が増える）の内部UUID。
  payeeId: string;
  amount: number;
  // 指定時は transfers.idempotency_key に保存し、UNIQUE制約で二重記録を防ぐ。
  idempotencyKey?: string;
}

export interface AppliedMoneyTransfer {
  id: number;
  payerId: string;
  payeeId: string;
  amount: number;
}

interface BalanceRow extends RowDataPacket {
  id: string;
  balance: number;
}

/**
 * 呼び出し側が開いたトランザクション(`connection`)の内部で、送金1件を原子的に反映する。
 *
 * 1. 支払人・受取人の行を単一の `SELECT ... FOR UPDATE` でまとめてロックする
 *    （インデックス順で一貫してロックするため、A→B と B→A の同時実行でもデッドロックしにくい）。
 * 2. 双方の存在と支払人の残高を検証する（不足は `InsufficientBalanceError`）。
 * 3. 支払人を減算・受取人を加算し、`transfers` に履歴を記録する。
 *
 * commit / rollback / 再試行は呼び出し側の責務。送金と請求承認の双方から再利用する。
 */
export async function applyMoneyTransfer(
  connection: PoolConnection,
  input: MoneyTransferInput,
): Promise<AppliedMoneyTransfer> {
  const { payerId, payeeId, amount, idempotencyKey } = input;

  const [rows] = await connection.execute<BalanceRow[]>(
    `SELECT BIN_TO_UUID(id) AS id, balance
       FROM users
      WHERE id IN (UUID_TO_BIN(?), UUID_TO_BIN(?))
      FOR UPDATE`,
    [payerId, payeeId],
  );

  const payer = rows.find(
    (row) => row.id.toLowerCase() === payerId.toLowerCase(),
  );
  const payee = rows.find(
    (row) => row.id.toLowerCase() === payeeId.toLowerCase(),
  );

  if (!payer || !payee) {
    throw new TransferParticipantNotFoundError();
  }

  if (Number(payer.balance) < amount) {
    throw new InsufficientBalanceError();
  }

  await connection.execute(
    `UPDATE users SET balance = balance - ? WHERE id = UUID_TO_BIN(?)`,
    [amount, payerId],
  );
  await connection.execute(
    `UPDATE users SET balance = balance + ? WHERE id = UUID_TO_BIN(?)`,
    [amount, payeeId],
  );

  const [result] = await connection.execute<ResultSetHeader>(
    `INSERT INTO transfers (sender_id, recipient_id, amount, idempotency_key)
     VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), ?, ?)`,
    [payerId, payeeId, amount, idempotencyKey ?? null],
  );

  return { id: result.insertId, payerId, payeeId, amount };
}
