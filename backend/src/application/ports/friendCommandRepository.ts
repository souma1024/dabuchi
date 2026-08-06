import type {
  FriendProfile,
  Friendship,
  FriendshipPair,
} from '../../domain/friendship.js';
import type { FriendshipNote } from '../../domain/friendshipNote.js';

export interface NewFriendship extends FriendshipPair {
  id: string;
  addedById: string;
  initialNote: string | null;
}

export interface FriendshipCommandRecord {
  friendshipId: string;
  friendId: string;
  note: string | null;
  blockedByCurrentUser: boolean;
  blocksCurrentUser: boolean;
}

export interface NewFriendshipNote {
  friendshipId: string;
  userId: string;
  message: string;
}

export interface FriendshipNoteKey {
  friendshipId: string;
  userId: string;
}

export interface UserBlockKey {
  blockerId: string;
  blockedUserId: string;
}

export interface FriendCommandRepository {
  findUserByPublicId: (userId: string) => Promise<FriendProfile | null>;
  friendshipExists: (pair: FriendshipPair) => Promise<boolean>;
  createFriendship: (friendship: NewFriendship) => Promise<Friendship | null>;
  findFriendshipForUser: (input: {
    currentUserId: string;
    friendshipId: string;
  }) => Promise<FriendshipCommandRecord | null>;
  createNote: (note: NewFriendshipNote) => Promise<FriendshipNote | null>;
  updateNote: (note: NewFriendshipNote) => Promise<FriendshipNote | null>;
  deleteNote: (key: FriendshipNoteKey) => Promise<void>;
  blockUser: (key: UserBlockKey) => Promise<void>;
  unblockUser: (key: UserBlockKey) => Promise<void>;
}
