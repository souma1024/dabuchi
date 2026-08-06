import type { FriendProfile } from '../../domain/friendship.js';

export interface FriendshipCursor {
  createdAt: string;
  id: string;
}

export interface FriendQueryRecord {
  friendshipId: string;
  friend: FriendProfile;
  addedBy: FriendProfile;
  addedAt: string;
  note: string | null;
}

export interface FriendQueryRepository {
  findFriends: (input: {
    currentUserId: string;
    cursor: FriendshipCursor | null;
    limit: number;
  }) => Promise<FriendQueryRecord[]>;
}
