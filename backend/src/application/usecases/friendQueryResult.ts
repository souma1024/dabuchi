import type { FriendProfile } from '../../domain/friendship.js';
import type { FriendQueryRecord } from '../ports/friendQueryRepository.js';

export interface FriendResult {
  friendshipId: string;
  friend: FriendProfile;
  addedBy: FriendProfile;
  addedAt: string;
  note: string | null;
}

export function toFriendResult(record: FriendQueryRecord): FriendResult {
  return {
    friendshipId: record.friendshipId,
    friend: record.friend,
    addedBy: record.addedBy,
    addedAt: record.addedAt,
    note: record.note,
  };
}
