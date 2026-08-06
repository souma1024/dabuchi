import type { RowDataPacket } from 'mysql2';
import type { Pool } from 'mysql2/promise';

import type {
  BlockedFriendCursor,
  BlockedFriendQueryRecord,
  FriendQueryRecord,
  FriendQueryRepository,
  FriendshipCursor,
  FriendshipDetailQueryRecord,
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

interface FriendshipDetailQueryRow extends FriendQueryRow {
  blockedByCurrentUser: number;
  blocksCurrentUser: number;
}

interface BlockedFriendQueryRow extends FriendQueryRow {
  blockedAt: string;
}

export class MysqlFriendQueryRepository implements FriendQueryRepository {
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
       JOIN users viewer ON viewer.id = UUID_TO_BIN(?)
       JOIN users friend ON friend.id = CASE
         WHEN f.user1_id = viewer.id THEN f.user2_id
         ELSE f.user1_id
       END
       JOIN users added_by ON added_by.id = f.added_by_id
       LEFT JOIN friendship_notes fn
         ON fn.friendship_id = f.id
        AND fn.user_id = viewer.id
       WHERE viewer.id IN (f.user1_id, f.user2_id)
         AND NOT EXISTS (
           SELECT 1
           FROM user_blocks ub
           WHERE (ub.blocker_id = viewer.id AND ub.blocked_user_id = friend.id)
              OR (ub.blocker_id = friend.id AND ub.blocked_user_id = viewer.id)
         )
       ${cursorClause}
       ORDER BY f.created_at ASC, f.id ASC
       LIMIT ?`,
      values,
    );

    return rows.map(toFriendQueryRecord);
  }

  async findFriendshipDetail(input: {
    currentUserId: string;
    friendshipId: string;
  }): Promise<FriendshipDetailQueryRecord | null> {
    const [rows] = await this.pool.execute<FriendshipDetailQueryRow[]>(
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
         fn.message AS note,
         EXISTS (
           SELECT 1
           FROM user_blocks outgoing_block
           WHERE outgoing_block.blocker_id = viewer.id
             AND outgoing_block.blocked_user_id = friend.id
         ) AS blockedByCurrentUser,
         EXISTS (
           SELECT 1
           FROM user_blocks incoming_block
           WHERE incoming_block.blocker_id = friend.id
             AND incoming_block.blocked_user_id = viewer.id
         ) AS blocksCurrentUser
       FROM friendships f
       JOIN users viewer ON viewer.id = UUID_TO_BIN(?)
       JOIN users friend ON friend.id = CASE
         WHEN f.user1_id = viewer.id THEN f.user2_id
         ELSE f.user1_id
       END
       JOIN users added_by ON added_by.id = f.added_by_id
       LEFT JOIN friendship_notes fn
         ON fn.friendship_id = f.id
        AND fn.user_id = viewer.id
       WHERE f.id = UUID_TO_BIN(?)
         AND viewer.id IN (f.user1_id, f.user2_id)
       LIMIT 1`,
      [input.currentUserId, input.friendshipId],
    );
    const row = rows[0];

    if (!row) {
      return null;
    }

    return {
      ...toFriendQueryRecord(row),
      blockedByCurrentUser: Boolean(row.blockedByCurrentUser),
      blocksCurrentUser: Boolean(row.blocksCurrentUser),
    };
  }

  async findBlockedFriends(input: {
    currentUserId: string;
    cursor: BlockedFriendCursor | null;
    limit: number;
  }): Promise<BlockedFriendQueryRecord[]> {
    const cursorClause = input.cursor
      ? `AND (
           ub.created_at > ?
           OR (ub.created_at = ? AND f.id > UUID_TO_BIN(?))
         )`
      : '';
    const values = [input.currentUserId];

    if (input.cursor) {
      values.push(
        input.cursor.blockedAt,
        input.cursor.blockedAt,
        input.cursor.friendshipId,
      );
    }

    values.push(String(input.limit));

    const [rows] = await this.pool.execute<BlockedFriendQueryRow[]>(
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
         fn.message AS note,
         DATE_FORMAT(ub.created_at, '%Y-%m-%d %H:%i:%s.%f') AS blockedAt
       FROM user_blocks ub
       JOIN users viewer ON viewer.id = UUID_TO_BIN(?)
       JOIN users friend ON friend.id = ub.blocked_user_id
       JOIN friendships f
         ON (f.user1_id = viewer.id AND f.user2_id = friend.id)
         OR (f.user1_id = friend.id AND f.user2_id = viewer.id)
       JOIN users added_by ON added_by.id = f.added_by_id
       LEFT JOIN friendship_notes fn
         ON fn.friendship_id = f.id
        AND fn.user_id = viewer.id
       WHERE ub.blocker_id = viewer.id
       ${cursorClause}
       ORDER BY ub.created_at ASC, f.id ASC
       LIMIT ?`,
      values,
    );

    return rows.map((row) => ({
      ...toFriendQueryRecord(row),
      blockedAt: row.blockedAt,
    }));
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
