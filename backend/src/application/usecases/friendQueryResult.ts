import type { FriendProfile } from '../../domain/friendship.js';
import { mysqlDateTimeToIso } from '../../shared/mysqlDateTime.js';
import type {
  BlockedFriendQueryRecord,
  FriendQueryRecord,
} from '../ports/friendQueryRepository.js';

export interface FriendResult {
  friendshipId: string;
  friend: FriendProfile;
  addedBy: FriendProfile;
  addedAt: string;
  note: string | null;
}

export interface BlockedFriendResult extends FriendResult {
  blockedAt: string;
}

// 日時はAPIの表現であるISO 8601へ揃える。
// ページングカーソルはrecord側のMySQL DATETIME文字列をそのまま使う。
export function toFriendResult(record: FriendQueryRecord): FriendResult {
  return {
    friendshipId: record.friendshipId,
    friend: record.friend,
    addedBy: record.addedBy,
    addedAt: mysqlDateTimeToIso(record.addedAt),
    note: record.note,
  };
}

export function toBlockedFriendResult(
  record: BlockedFriendQueryRecord,
): BlockedFriendResult {
  return {
    ...toFriendResult(record),
    blockedAt: mysqlDateTimeToIso(record.blockedAt),
  };
}
