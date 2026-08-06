import type { Pool, RowDataPacket } from 'mysql2/promise';

import type {
  FindUserRecipientsInput,
  RecipientCursor,
  UserRecipientRepository,
} from '../../application/ports/userRecipientRepository.js';
import type { UserRecipientRecord } from '../../domain/userRecipient.js';

interface ExistsRow extends RowDataPacket {
  found: number;
}

interface RecipientRow extends RowDataPacket, UserRecipientRecord {}

const BASE_RECIPIENT_QUERY = `
  SELECT
    BIN_TO_UUID(id) AS id,
    user_name AS name,
    profile_url AS profileUrl,
    DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s.%f') AS createdAt
  FROM users
  WHERE id <> UUID_TO_BIN(?)
`;

export class MysqlUserRecipientRepository implements UserRecipientRepository {
  constructor(private readonly pool: Pool) {}

  async existsById(id: string): Promise<boolean> {
    const [rows] = await this.pool.execute<ExistsRow[]>(
      'SELECT 1 AS found FROM users WHERE id = UUID_TO_BIN(?) LIMIT 1',
      [id],
    );

    return rows.length > 0;
  }

  async findRecipients(
    input: FindUserRecipientsInput,
  ): Promise<UserRecipientRecord[]> {
    const { cursorClause, values: cursorValues } = buildCursorClause(
      input.cursor,
    );
    const values: string[] = [input.currentUserId];
    values.push(...cursorValues);

    // mysql2 sends JavaScript numbers as DOUBLE values, which MySQL rejects for LIMIT.
    values.push(String(input.limit));

    const orderByClause =
      input.sort === 'created-desc'
        ? 'created_at DESC, id DESC'
        : input.sort === 'name-asc'
          ? 'user_name ASC, id ASC'
          : 'created_at ASC, id ASC';

    const [rows] = await this.pool.execute<RecipientRow[]>(
      `${BASE_RECIPIENT_QUERY}
       ${cursorClause}
       ORDER BY ${orderByClause}
       LIMIT ?`,
      values,
    );

    return rows.map(({ id, name, profileUrl, createdAt }) => ({
      id,
      name,
      profileUrl,
      createdAt,
    }));
  }
}

function buildCursorClause(cursor: RecipientCursor | null): {
  cursorClause: string;
  values: string[];
} {
  if (!cursor) {
    return { cursorClause: '', values: [] };
  }

  if (cursor.sort === 'name-asc') {
    return {
      cursorClause: `AND (
          user_name > ?
          OR (user_name = ? AND id > UUID_TO_BIN(?))
        )`,
      values: [cursor.value.name, cursor.value.name, cursor.value.id],
    };
  }

  if (cursor.sort === 'created-desc') {
    return {
      cursorClause: `AND (
          created_at < ?
          OR (created_at = ? AND id < UUID_TO_BIN(?))
        )`,
      values: [cursor.value.createdAt, cursor.value.createdAt, cursor.value.id],
    };
  }

  return {
    cursorClause: `AND (
        created_at > ?
        OR (created_at = ? AND id > UUID_TO_BIN(?))
      )`,
    values: [cursor.value.createdAt, cursor.value.createdAt, cursor.value.id],
  };
}
