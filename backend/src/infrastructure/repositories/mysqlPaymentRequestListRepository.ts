import type { Pool, RowDataPacket } from 'mysql2/promise';

import type {
  FindPaymentRequestsInput,
  PaymentRequestListRepository,
} from '../../application/ports/paymentRequestListRepository.js';
import type { PaymentRequestRecord } from '../../domain/paymentRequest.js';

interface PaymentRequestRow extends RowDataPacket, PaymentRequestRecord {}

// directionごとに、絞り込む列と相手として結合する列が入れ替わる。
// SQLへ列名を埋め込むが、値は検証済みのdirectionでこの定数を引いた結果のみ。
// 外部入力がSQLへ渡ることはない。
const DIRECTION_COLUMNS = {
  received: { owner: 'recipient_id', counterparty: 'requester_id' },
  sent: { owner: 'requester_id', counterparty: 'recipient_id' },
} as const;

export class MysqlPaymentRequestListRepository implements PaymentRequestListRepository {
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

    // mysql2 sends JavaScript numbers as DOUBLE values, which MySQL rejects for LIMIT.
    values.push(String(input.limit));

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
       LIMIT ?`,
      values,
    );

    return rows.map((row) => ({
      id: row.id,
      counterpartyId: row.counterpartyId,
      counterpartyName: row.counterpartyName,
      counterpartyProfileUrl: row.counterpartyProfileUrl,
      amount: Number(row.amount),
      status: row.status,
      createdAt: row.createdAt,
      respondedAt: row.respondedAt,
    }));
  }
}
