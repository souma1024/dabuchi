import type { RowDataPacket } from 'mysql2';
import type { Pool } from 'mysql2/promise';

import type {
  AuthRepository,
  AuthenticatedUser,
  NewUser,
  UserCredential,
} from '../../application/ports/authRepository.js';
import { isDuplicateKeyViolation } from '../database/mysqlError.js';

interface CredentialRow extends RowDataPacket {
  id: string;
  passwordHash: string | null;
}

interface AuthenticatedUserRow extends RowDataPacket {
  id: string;
  userId: string;
}

export class MysqlAuthRepository implements AuthRepository {
  constructor(private readonly pool: Pool) {}

  async findCredentialByUserId(userId: string): Promise<UserCredential | null> {
    const [rows] = await this.pool.execute<CredentialRow[]>(
      `SELECT BIN_TO_UUID(id) AS id,
              password_hash AS passwordHash
         FROM users
        WHERE user_id = ?
        LIMIT 1`,
      [userId],
    );

    const row = rows[0];

    return row ? { id: row.id, passwordHash: row.passwordHash } : null;
  }

  async createUser(user: NewUser): Promise<boolean> {
    try {
      await this.pool.execute(
        `INSERT INTO users (id, user_id, password_hash, user_name, profile_url)
         VALUES (UUID_TO_BIN(?), ?, ?, ?, ?)`,
        [user.id, user.userId, user.passwordHash, user.name, user.profileUrl],
      );

      return true;
    } catch (error) {
      // 公開user_idの一意制約。同時登録の競合もここへ来る。
      if (isDuplicateKeyViolation(error)) {
        return false;
      }

      throw error;
    }
  }

  async createSession(session: {
    tokenHash: Buffer;
    userId: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.pool.execute(
      `INSERT INTO sessions (token_hash, user_id, expires_at)
       VALUES (?, UUID_TO_BIN(?), ?)`,
      [session.tokenHash, session.userId, session.expiresAt],
    );
  }

  async findUserBySessionToken(
    tokenHash: Buffer,
  ): Promise<AuthenticatedUser | null> {
    const [rows] = await this.pool.execute<AuthenticatedUserRow[]>(
      `SELECT BIN_TO_UUID(u.id) AS id,
              u.user_id AS userId
         FROM sessions s
         JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ?
          AND s.expires_at > CURRENT_TIMESTAMP(6)
        LIMIT 1`,
      [tokenHash],
    );

    const row = rows[0];

    return row ? { id: row.id, userId: row.userId } : null;
  }

  async deleteSession(tokenHash: Buffer): Promise<void> {
    await this.pool.execute(`DELETE FROM sessions WHERE token_hash = ?`, [
      tokenHash,
    ]);
  }
}
