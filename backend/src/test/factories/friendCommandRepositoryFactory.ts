import { vi } from 'vitest';

import type {
  FriendCommandRepository,
  FriendshipCommandRecord,
} from '../../application/ports/friendCommandRepository.js';
import type { FriendProfile, Friendship } from '../../domain/friendship.js';
import type { FriendshipNote } from '../../domain/friendshipNote.js';

const DEFAULT_FRIEND: FriendProfile = {
  id: '22222222-2222-4222-8222-222222222222',
  userId: 'friend-002',
  name: '佐藤 花子',
  profileUrl: '/assets/profiles/human2.png',
};

interface FriendCommandRepositoryFactoryOptions {
  friend?: FriendProfile | null;
  friendshipExists?: boolean;
  savedFriendship?: Friendship | null;
  friendship?: FriendshipCommandRecord | null;
  savedNote?: FriendshipNote | null;
}

export function createFriendCommandRepository(
  options: FriendCommandRepositoryFactoryOptions = {},
): FriendCommandRepository {
  return {
    findUserByPublicId: vi
      .fn<FriendCommandRepository['findUserByPublicId']>()
      .mockResolvedValue(
        options.friend === undefined ? DEFAULT_FRIEND : options.friend,
      ),
    friendshipExists: vi
      .fn<FriendCommandRepository['friendshipExists']>()
      .mockResolvedValue(options.friendshipExists ?? false),
    createFriendship: vi
      .fn<FriendCommandRepository['createFriendship']>()
      .mockImplementation((friendship) =>
        Promise.resolve(
          options.savedFriendship === undefined
            ? {
                ...friendship,
                createdAt: '2026-08-06 12:00:00.000000',
              }
            : options.savedFriendship,
        ),
      ),
    findFriendshipForUser: vi
      .fn<FriendCommandRepository['findFriendshipForUser']>()
      .mockResolvedValue(
        options.friendship === undefined
          ? {
              friendshipId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
              friendId: DEFAULT_FRIEND.id,
              note: null,
              blockedByCurrentUser: false,
              blocksCurrentUser: false,
            }
          : options.friendship,
      ),
    createNote: vi
      .fn<FriendCommandRepository['createNote']>()
      .mockImplementation((note) =>
        Promise.resolve(
          options.savedNote === undefined
            ? {
                ...note,
                createdAt: '2026-08-06 12:10:00.000000',
                updatedAt: '2026-08-06 12:10:00.000000',
              }
            : options.savedNote,
        ),
      ),
  };
}
