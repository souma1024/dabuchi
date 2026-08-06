import type { BlockedFriend, Friend, FriendProfile } from '../types';

/** テスト用の友達プロフィール。indexで人物を作り分ける。 */
export function createFriendProfile(
  index = 1,
  overrides: Partial<FriendProfile> = {},
): FriendProfile {
  return {
    id: `user-${String(index)}`,
    userId: `friend-${String(index).padStart(3, '0')}`,
    name: `友達 ${String(index)}`,
    profileUrl: `/assets/profiles/human${String(((index - 1) % 6) + 1)}.png`,
    ...overrides,
  };
}

/** テスト用の友達1人分。 */
export function createFriend(
  index = 1,
  overrides: Partial<Friend> = {},
): Friend {
  return {
    friendshipId: `friendship-${String(index)}`,
    friend: createFriendProfile(index),
    addedBy: createFriendProfile(index + 100),
    addedAt: '2026-08-06T09:00:00.000Z',
    note: null,
    ...overrides,
  };
}

/** テスト用の友達を連番でまとめて作る。 */
export function createFriends(count: number): Friend[] {
  return Array.from({ length: count }, (_, index) => createFriend(index + 1));
}

/** テスト用のブロック中の友達1人分。 */
export function createBlockedFriend(
  index = 1,
  overrides: Partial<BlockedFriend> = {},
): BlockedFriend {
  return {
    ...createFriend(index),
    blockedAt: '2026-08-06T10:00:00.000Z',
    ...overrides,
  };
}
