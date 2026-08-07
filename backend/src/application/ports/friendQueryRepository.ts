import type { FriendProfile } from '../../domain/friendship.js';

export type FriendSort = 'created-asc' | 'created-desc';

export interface FriendshipCreatedAtCursor {
  createdAt: string;
  id: string;
}

export interface FriendshipCursor {
  sort: FriendSort;
  value: FriendshipCreatedAtCursor;
}

export interface BlockedFriendCursor {
  blockedAt: string;
  friendshipId: string;
}

export interface FriendQueryRecord {
  friendshipId: string;
  friend: FriendProfile;
  addedBy: FriendProfile;
  addedAt: string;
  note: string | null;
}

export interface FriendshipDetailQueryRecord extends FriendQueryRecord {
  blockedByCurrentUser: boolean;
  blocksCurrentUser: boolean;
}

export interface BlockedFriendQueryRecord extends FriendQueryRecord {
  blockedAt: string;
}

export interface FriendQueryRepository {
  findFriends: (input: {
    currentUserId: string;
    cursor: FriendshipCursor | null;
    limit: number;
    sort: FriendSort;
  }) => Promise<FriendQueryRecord[]>;
  findFriendshipDetail: (input: {
    currentUserId: string;
    friendshipId: string;
  }) => Promise<FriendshipDetailQueryRecord | null>;
  findBlockedFriends: (input: {
    currentUserId: string;
    cursor: BlockedFriendCursor | null;
    limit: number;
  }) => Promise<BlockedFriendQueryRecord[]>;
}
