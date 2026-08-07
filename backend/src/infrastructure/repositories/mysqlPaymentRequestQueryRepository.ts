import type { Pool, RowDataPacket } from 'mysql2/promise';

import type {
  FindPaymentRequestByIdInput,
  FindPaymentRequestsInput,
  PaymentRequestQueryRepository,
} from '../../application/ports/paymentRequestQueryRepository.js';
import type { PaymentRequestRecord } from '../../domain/paymentRequest.js';
import { limitClause } from '../database/limitClause.js';

interface PaymentRequestRow extends RowDataPacket, PaymentRequestRecord {}

// directionごとに、絞り込む列と相手として結合する列が入れ替わる。
// SQLへ列名を埋め込むが、値は検証済みのdirectionでこの定数を引いた結果のみ。
// 外部入力がSQLへ渡ることはない。
const DIRECTION_COLUMNS = {
  received: { owner: 'recipient_id', counterparty: 'requester_id' },
  sent: { owner: 'requester_id', counterparty: 'recipient_id' },
} as const;

export class MysqlPaymentRequestQueryRepository implements PaymentRequestQueryRepository {
  constructor(private readonly pool: Pool) {}

  async findPaymentRequests(
    input: FindPaymentRequestsInput,
  ): Promise<PaymentRequestRecord[]> {
    const columns = DIRECTION_COLUMNS[input.direction];
    const values: string[] = [input.currentUserInternalId];
    const conditions: string[] = [];

    if (input.status !== null) {
      conditions.push('AND pr.status = ?');
      values.push(input.status);
    }

    // 新しい順に並べるため、カーソルは「より小さい」方向で比較する。
    if (input.cursor !== null) {
      conditions.push(`AND (
          pr.created_at < ?
          OR (pr.created_at = ? AND pr.id < UUID_TO_BIN(?))
        )`);
      values.push(
        input.cursor.createdAt,
        input.cursor.createdAt,
        input.cursor.id,
      );
    }

    const [rows] = await this.pool.execute<PaymentRequestRow[]>(
      `SELECT
         BIN_TO_UUID(pr.id) AS id,
         BIN_TO_UUID(counterparty.id) AS counterpartyId,
         counterparty.user_name AS counterpartyName,
         counterparty.profile_url AS counterpartyProfileUrl,
         pr.amount AS amount,
         pr.status AS status,
         DATE_FORMAT(pr.created_at, '%Y-%m-%d %H:%i:%s.%f') AS createdAt,
         DATE_FORMAT(pr.responded_at, '%Y-%m-%d %H:%i:%s.%f') AS respondedAt
       FROM payment_requests pr
       JOIN users counterparty ON counterparty.id = pr.${columns.counterparty}
       WHERE pr.${columns.owner} = UUID_TO_BIN(?)
       ${conditions.join('\n       ')}
       ORDER BY pr.created_at DESC, pr.id DESC
       ${limitClause(input.limit)}`,
      values,
    );

    return rows.map(toRecord);
  }

  async findPaymentRequestById(
    input: FindPaymentRequestByIdInput,
  ): Promise<PaymentRequestRecord | null> {
    // 相手は「現在ユーザーでない側」。一覧と違いdirectionを受け取らないため、
    // 請求者か被請求者かを行ごとに判定して結合する。
    // 当事者でなければWHEREで弾き、存在の有無を呼び出し側へ漏らさない。
    const [rows] = await this.pool.execute<PaymentRequestRow[]>(
      `SELECT
         BIN_TO_UUID(pr.id) AS id,
         BIN_TO_UUID(counterparty.id) AS counterpartyId,
         counterparty.user_name AS counterpartyName,
         counterparty.profile_url AS counterpartyProfileUrl,
         pr.amount AS amount,
         pr.status AS status,
         DATE_FORMAT(pr.created_at, '%Y-%m-%d %H:%i:%s.%f') AS createdAt,
         DATE_FORMAT(pr.responded_at, '%Y-%m-%d %H:%i:%s.%f') AS respondedAt
       FROM payment_requests pr
       JOIN users counterparty
         ON counterparty.id = CASE
           WHEN pr.requester_id = UUID_TO_BIN(?) THEN pr.recipient_id
           ELSE pr.requester_id
         END
       WHERE pr.id = UUID_TO_BIN(?)
         AND (
           pr.requester_id = UUID_TO_BIN(?)
           OR pr.recipient_id = UUID_TO_BIN(?)
         )`,
      [
        input.currentUserInternalId,
        input.paymentRequestId,
        input.currentUserInternalId,
        input.currentUserInternalId,
      ],
    );

    const row = rows[0];

    return row ? toRecord(row) : null;
  }
}

function toRecord(row: PaymentRequestRow): PaymentRequestRecord {
  return {
    id: row.id,
    counterpartyId: row.counterpartyId,
    counterpartyName: row.counterpartyName,
    counterpartyProfileUrl: row.counterpartyProfileUrl,
    amount: Number(row.amount),
    status: row.status,
    createdAt: row.createdAt,
    respondedAt: row.respondedAt,
  };
}
