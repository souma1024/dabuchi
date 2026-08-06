import type { FriendProfile } from '../../domain/friendship.js';

export interface FriendshipCursor {
  createdAt: string;
  id: string;
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
