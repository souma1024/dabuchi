import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { Pool } from 'mysql2/promise';

import type { NewFriendship } from '../../application/ports/friendCommandRepository.js';
import type {
  FriendProfile,
  Friendship,
  FriendshipPair,
} from '../../domain/friendship.js';

interface FriendProfileRow extends RowDataPacket, FriendProfile {}

interface ExistsRow extends RowDataPacket {
  found: number;
}

interface FriendshipRow extends RowDataPacket, Friendship {}

export class MysqlFriendCommandRepository {
  constructor(private readonly pool: Pool) {}

  async findUserByPublicId(userId: string): Promise<FriendProfile | null> {
    const [rows] = await this.pool.execute<FriendProfileRow[]>(
      `SELECT
         BIN_TO_UUID(id) AS id,
         user_id AS userId,
         user_name AS name,
         profile_url AS profileUrl
       FROM users
       WHERE user_id = ?
       LIMIT 1`,
      [userId],
    );

    return rows[0] ?? null;
  }

  async friendshipExists(pair: FriendshipPair): Promise<boolean> {
    const [rows] = await this.pool.execute<ExistsRow[]>(
      `SELECT 1 AS found
       FROM friendships
       WHERE user1_id = UUID_TO_BIN(?)
         AND user2_id = UUID_TO_BIN(?)
       LIMIT 1`,
      [pair.user1Id, pair.user2Id],
    );

    return rows.length > 0;
  }

  async createFriendship(
    friendship: NewFriendship,
  ): Promise<Friendship | null> {
    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();
      await connection.execute<ResultSetHeader>(
        `INSERT INTO friendships (id, user1_id, user2_id, added_by_id)
         VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), UUID_TO_BIN(?), UUID_TO_BIN(?))`,
        [
          friendship.id,
          friendship.user1Id,
          friendship.user2Id,
          friendship.addedById,
        ],
      );

      if (friendship.initialNote !== null) {
        await connection.execute<ResultSetHeader>(
          `INSERT INTO friendship_notes (friendship_id, user_id, message)
           VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), ?)`,
          [friendship.id, friendship.addedById, friendship.initialNote],
        );
      }

      const [rows] = await connection.execute<FriendshipRow[]>(
        `SELECT
           BIN_TO_UUID(id) AS id,
           BIN_TO_UUID(user1_id) AS user1Id,
           BIN_TO_UUID(user2_id) AS user2Id,
           BIN_TO_UUID(added_by_id) AS addedById,
           DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s.%f') AS createdAt
         FROM friendships
         WHERE id = UUID_TO_BIN(?)
         LIMIT 1`,
        [friendship.id],
      );
      const savedFriendship = rows[0];

      if (!savedFriendship) {
        throw new Error('Created friendship was not found.');
      }

      await connection.commit();
      return savedFriendship;
    } catch (error) {
      await connection.rollback();

      if (isDuplicateEntry(error)) {
        return null;
      }

      throw error;
    } finally {
      connection.release();
    }
  }
}

function isDuplicateEntry(error: unknown): error is { code: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ER_DUP_ENTRY'
  );
}
