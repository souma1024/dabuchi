import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { Pool } from 'mysql2/promise';

import type {
  FriendshipCommandRecord,
  FriendshipNoteKey,
  NewFriendship,
  NewFriendshipNote,
} from '../../application/ports/friendCommandRepository.js';
import type {
  FriendProfile,
  Friendship,
  FriendshipPair,
} from '../../domain/friendship.js';
import type { FriendshipNote } from '../../domain/friendshipNote.js';

interface FriendProfileRow extends RowDataPacket, FriendProfile {}

interface ExistsRow extends RowDataPacket {
  found: number;
}

interface FriendshipRow extends RowDataPacket, Friendship {}

interface FriendshipCommandRow extends RowDataPacket {
  friendshipId: string;
  friendId: string;
  note: string | null;
  blockedByCurrentUser: number;
  blocksCurrentUser: number;
}

interface FriendshipNoteRow extends RowDataPacket, FriendshipNote {}

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

  async findFriendshipForUser(input: {
    currentUserId: string;
    friendshipId: string;
  }): Promise<FriendshipCommandRecord | null> {
    const [rows] = await this.pool.execute<FriendshipCommandRow[]>(
      `SELECT
         BIN_TO_UUID(f.id) AS friendshipId,
         BIN_TO_UUID(
           CASE
             WHEN f.user1_id = requesting_user.id THEN f.user2_id
             ELSE f.user1_id
           END
         ) AS friendId,
         fn.message AS note,
         EXISTS (
           SELECT 1
           FROM user_blocks outgoing_block
           WHERE outgoing_block.blocker_id = requesting_user.id
             AND outgoing_block.blocked_user_id = CASE
               WHEN f.user1_id = requesting_user.id THEN f.user2_id
               ELSE f.user1_id
             END
         ) AS blockedByCurrentUser,
         EXISTS (
           SELECT 1
           FROM user_blocks incoming_block
           WHERE incoming_block.blocker_id = CASE
               WHEN f.user1_id = requesting_user.id THEN f.user2_id
               ELSE f.user1_id
             END
             AND incoming_block.blocked_user_id = requesting_user.id
         ) AS blocksCurrentUser
       FROM friendships f
       JOIN users requesting_user ON requesting_user.id = UUID_TO_BIN(?)
       LEFT JOIN friendship_notes fn
         ON fn.friendship_id = f.id
        AND fn.user_id = requesting_user.id
       WHERE f.id = UUID_TO_BIN(?)
         AND requesting_user.id IN (f.user1_id, f.user2_id)
       LIMIT 1`,
      [input.currentUserId, input.friendshipId],
    );
    const row = rows[0];

    if (!row) {
      return null;
    }

    return {
      ...row,
      blockedByCurrentUser: Boolean(row.blockedByCurrentUser),
      blocksCurrentUser: Boolean(row.blocksCurrentUser),
    };
  }

  async createNote(note: NewFriendshipNote): Promise<FriendshipNote | null> {
    try {
      await this.pool.execute<ResultSetHeader>(
        `INSERT INTO friendship_notes (friendship_id, user_id, message)
         VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), ?)`,
        [note.friendshipId, note.userId, note.message],
      );
    } catch (error) {
      if (isDuplicateEntry(error)) {
        return null;
      }

      throw error;
    }

    const savedNote = await this.findNote(note);

    if (!savedNote) {
      throw new Error('Saved friendship note was not found.');
    }

    return savedNote;
  }

  async updateNote(note: NewFriendshipNote): Promise<FriendshipNote | null> {
    await this.pool.execute<ResultSetHeader>(
      `UPDATE friendship_notes
       SET message = ?
       WHERE friendship_id = UUID_TO_BIN(?)
         AND user_id = UUID_TO_BIN(?)`,
      [note.message, note.friendshipId, note.userId],
    );

    return this.findNote(note);
  }

  async deleteNote(key: FriendshipNoteKey): Promise<void> {
    await this.pool.execute<ResultSetHeader>(
      `DELETE FROM friendship_notes
       WHERE friendship_id = UUID_TO_BIN(?)
         AND user_id = UUID_TO_BIN(?)`,
      [key.friendshipId, key.userId],
    );
  }

  private async findNote(
    key: FriendshipNoteKey,
  ): Promise<FriendshipNote | null> {
    const [rows] = await this.pool.execute<FriendshipNoteRow[]>(
      `SELECT
         BIN_TO_UUID(friendship_id) AS friendshipId,
         BIN_TO_UUID(user_id) AS userId,
         message,
         DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s.%f') AS createdAt,
         DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s.%f') AS updatedAt
       FROM friendship_notes
       WHERE friendship_id = UUID_TO_BIN(?)
         AND user_id = UUID_TO_BIN(?)
       LIMIT 1`,
      [key.friendshipId, key.userId],
    );
    return rows[0] ?? null;
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
