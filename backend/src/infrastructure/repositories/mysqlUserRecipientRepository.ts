import type { Pool, RowDataPacket } from 'mysql2/promise';

import type {
  FindUserRecipientsInput,
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
    const cursorClause = input.cursor
      ? `AND (
          created_at > ?
          OR (created_at = ? AND id > UUID_TO_BIN(?))
        )`
      : '';
    const values: Array<number | string> = [input.currentUserId];

    if (input.cursor) {
      values.push(
        input.cursor.createdAt,
        input.cursor.createdAt,
        input.cursor.id,
      );
    }

    values.push(input.limit);

    const [rows] = await this.pool.execute<RecipientRow[]>(
      `${BASE_RECIPIENT_QUERY}
       ${cursorClause}
       ORDER BY created_at ASC, id ASC
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
