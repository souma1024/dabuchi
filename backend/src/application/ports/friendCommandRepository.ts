import type {
  FriendProfile,
  Friendship,
  FriendshipPair,
} from '../../domain/friendship.js';

export interface NewFriendship extends FriendshipPair {
  id: string;
  addedById: string;
  initialNote: string | null;
}

export interface FriendCommandRepository {
  findUserByPublicId: (userId: string) => Promise<FriendProfile | null>;
  friendshipExists: (pair: FriendshipPair) => Promise<boolean>;
  createFriendship: (friendship: NewFriendship) => Promise<Friendship | null>;
}
