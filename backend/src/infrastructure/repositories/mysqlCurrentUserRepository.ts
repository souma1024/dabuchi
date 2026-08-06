import type { Pool, RowDataPacket } from 'mysql2/promise';

import type { CurrentUserRepository } from '../../application/ports/currentUserRepository.js';
import type { CurrentUser } from '../../domain/currentUser.js';

interface CurrentUserRow extends RowDataPacket, CurrentUser {}

export class MysqlCurrentUserRepository implements CurrentUserRepository {
  constructor(private readonly pool: Pool) {}

  async findByUserId(userId: string): Promise<CurrentUser | null> {
    const [rows] = await this.pool.execute<CurrentUserRow[]>(
      `SELECT
         BIN_TO_UUID(id) AS id,
         user_id AS userId,
         user_name AS name,
         profile_url AS profileUrl,
         balance
       FROM users
       WHERE user_id = ?
       LIMIT 1`,
      [userId],
    );
    const user = rows[0];

    return user
      ? {
          id: user.id,
          userId: user.userId,
          name: user.name,
          profileUrl: user.profileUrl,
          balance: user.balance,
        }
      : null;
  }
}
