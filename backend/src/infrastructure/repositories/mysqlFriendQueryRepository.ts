import type { RowDataPacket } from 'mysql2';
import type { Pool } from 'mysql2/promise';

import type {
  FriendQueryRecord,
  FriendshipCursor,
} from '../../application/ports/friendQueryRepository.js';

interface FriendQueryRow extends RowDataPacket {
  friendshipId: string;
  friendId: string;
  friendUserId: string;
  friendName: string;
  friendProfileUrl: string;
  addedById: string;
  addedByUserId: string;
  addedByName: string;
  addedByProfileUrl: string;
  addedAt: string;
  note: string | null;
}

export class MysqlFriendQueryRepository {
  constructor(private readonly pool: Pool) {}

  async findFriends(input: {
    currentUserId: string;
    cursor: FriendshipCursor | null;
    limit: number;
  }): Promise<FriendQueryRecord[]> {
    const cursorClause = input.cursor
      ? `AND (
           f.created_at > ?
           OR (f.created_at = ? AND f.id > UUID_TO_BIN(?))
         )`
      : '';
    const values = [input.currentUserId];

    if (input.cursor) {
      values.push(
        input.cursor.createdAt,
        input.cursor.createdAt,
        input.cursor.id,
      );
    }

    // mysql2 sends JavaScript numbers as DOUBLE values, which MySQL rejects for LIMIT.
    values.push(String(input.limit));

    const [rows] = await this.pool.execute<FriendQueryRow[]>(
      `SELECT
         BIN_TO_UUID(f.id) AS friendshipId,
         BIN_TO_UUID(friend.id) AS friendId,
         friend.user_id AS friendUserId,
         friend.user_name AS friendName,
         friend.profile_url AS friendProfileUrl,
         BIN_TO_UUID(added_by.id) AS addedById,
         added_by.user_id AS addedByUserId,
         added_by.user_name AS addedByName,
         added_by.profile_url AS addedByProfileUrl,
         DATE_FORMAT(f.created_at, '%Y-%m-%d %H:%i:%s.%f') AS addedAt,
         fn.message AS note
       FROM friendships f
       JOIN users current_user ON current_user.id = UUID_TO_BIN(?)
       JOIN users friend ON friend.id = CASE
         WHEN f.user1_id = current_user.id THEN f.user2_id
         ELSE f.user1_id
       END
       JOIN users added_by ON added_by.id = f.added_by_id
       LEFT JOIN friendship_notes fn
         ON fn.friendship_id = f.id
        AND fn.user_id = current_user.id
       WHERE current_user.id IN (f.user1_id, f.user2_id)
         AND NOT EXISTS (
           SELECT 1
           FROM user_blocks ub
           WHERE (ub.blocker_id = current_user.id AND ub.blocked_user_id = friend.id)
              OR (ub.blocker_id = friend.id AND ub.blocked_user_id = current_user.id)
         )
       ${cursorClause}
       ORDER BY f.created_at ASC, f.id ASC
       LIMIT ?`,
      values,
    );

    return rows.map(toFriendQueryRecord);
  }
}

function toFriendQueryRecord(row: FriendQueryRow): FriendQueryRecord {
  return {
    friendshipId: row.friendshipId,
    friend: {
      id: row.friendId,
      userId: row.friendUserId,
      name: row.friendName,
      profileUrl: row.friendProfileUrl,
    },
    addedBy: {
      id: row.addedById,
      userId: row.addedByUserId,
      name: row.addedByName,
      profileUrl: row.addedByProfileUrl,
    },
    addedAt: row.addedAt,
    note: row.note,
  };
}
