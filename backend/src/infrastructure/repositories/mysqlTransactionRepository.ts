import type { Pool, RowDataPacket } from 'mysql2/promise';

import type {
  FindUserTransactionsInput,
  TransactionCursor,
  TransactionRepository,
} from '../../application/ports/transactionRepository.js';
import type { TransactionRecord } from '../../domain/transaction.js';

interface TransactionRow extends RowDataPacket, TransactionRecord {}

// sender/recipient の両方向を統合し、現在ユーザーから見た「相手」を算出する。
// id は BIGINT のため CHAR へキャストして文字列で返し、桁溢れを避ける。
const BASE_TRANSACTION_QUERY = `
  SELECT
    CAST(t.id AS CHAR) AS id,
    CASE
      WHEN t.sender_id = UUID_TO_BIN(?) THEN 'sent'
      ELSE 'received'
    END AS direction,
    BIN_TO_UUID(
      CASE
        WHEN t.sender_id = UUID_TO_BIN(?) THEN t.recipient_id
        ELSE t.sender_id
      END
    ) AS counterpartyId,
    counterparty.user_name AS counterpartyName,
    counterparty.profile_url AS counterpartyProfileUrl,
    t.amount AS amount,
    DATE_FORMAT(t.created_at, '%Y-%m-%d %H:%i:%s.%f') AS createdAt
  FROM transfers t
  JOIN users counterparty
    ON counterparty.id = CASE
      WHEN t.sender_id = UUID_TO_BIN(?) THEN t.recipient_id
      ELSE t.sender_id
    END
  WHERE (t.sender_id = UUID_TO_BIN(?) OR t.recipient_id = UUID_TO_BIN(?))
`;

export class MysqlTransactionRepository implements TransactionRepository {
  constructor(private readonly pool: Pool) {}

  async findTransactions(
    input: FindUserTransactionsInput,
  ): Promise<TransactionRecord[]> {
    const { cursorClause, values: cursorValues } = buildCursorClause(
      input.cursor,
    );
    // BASE_TRANSACTION_QUERY 内の UUID_TO_BIN(?) は現在ユーザーIDを5回参照する。
    const values: string[] = [
      input.currentUserId,
      input.currentUserId,
      input.currentUserId,
      input.currentUserId,
      input.currentUserId,
    ];
    values.push(...cursorValues);

    // mysql2 sends JavaScript numbers as DOUBLE values, which MySQL rejects for LIMIT.
    values.push(String(input.limit));
    const orderByClause =
      input.sort === 'created-asc'
        ? 't.created_at ASC, t.id ASC'
        : 't.created_at DESC, t.id DESC';

    const [rows] = await this.pool.execute<TransactionRow[]>(
      `${BASE_TRANSACTION_QUERY}
       ${cursorClause}
       ORDER BY ${orderByClause}
       LIMIT ?`,
      values,
    );

    return rows.map((row) => ({
      id: row.id,
      counterpartyId: row.counterpartyId,
      counterpartyName: row.counterpartyName,
      counterpartyProfileUrl: row.counterpartyProfileUrl,
      amount: row.amount,
      direction: row.direction,
      createdAt: row.createdAt,
    }));
  }
}

function buildCursorClause(cursor: TransactionCursor | null): {
  cursorClause: string;
  values: string[];
} {
  if (!cursor) {
    return { cursorClause: '', values: [] };
  }

  if (cursor.sort === 'created-asc') {
    return {
      cursorClause: `AND (
          t.created_at > ?
          OR (t.created_at = ? AND t.id > ?)
        )`,
      values: [cursor.value.createdAt, cursor.value.createdAt, cursor.value.id],
    };
  }

  return {
    cursorClause: `AND (
        t.created_at < ?
        OR (t.created_at = ? AND t.id < ?)
      )`,
    values: [cursor.value.createdAt, cursor.value.createdAt, cursor.value.id],
  };
}
