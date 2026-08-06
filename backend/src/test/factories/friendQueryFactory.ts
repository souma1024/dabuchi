import type { FriendProfile } from '../../domain/friendship.js';
import type {
  BlockedFriendQueryRecord,
  FriendQueryRecord,
  FriendshipDetailQueryRecord,
} from '../../application/ports/friendQueryRepository.js';

export function createFriendProfile(
  index = 1,
  overrides: Partial<FriendProfile> = {},
): FriendProfile {
  const suffix = String(index).padStart(12, '0');

  return {
    id: `00000000-0000-4000-8000-${suffix}`,
    userId: `friend-${String(index).padStart(3, '0')}`,
    name: `友達 ${index}`,
    profileUrl: `/assets/profiles/human${((index - 1) % 6) + 1}.png`,
    ...overrides,
  };
}

export function createFriendQueryRecord(
  index = 1,
  overrides: Partial<FriendQueryRecord> = {},
): FriendQueryRecord {
  return {
    friendshipId: `10000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    friend: createFriendProfile(index),
    addedBy: createFriendProfile(index + 100),
    addedAt: `2026-08-06 10:00:${String(index).padStart(2, '0')}.000000`,
    note: index % 2 === 0 ? `メモ ${index}` : null,
    ...overrides,
  };
}

export function createFriendQueryRecords(count: number): FriendQueryRecord[] {
  return Array.from({ length: count }, (_, index) =>
    createFriendQueryRecord(index + 1),
  );
}

export function createFriendshipDetailQueryRecord(
  index = 1,
  overrides: Partial<FriendshipDetailQueryRecord> = {},
): FriendshipDetailQueryRecord {
  return {
    ...createFriendQueryRecord(index),
    blockedByCurrentUser: false,
    blocksCurrentUser: false,
    ...overrides,
  };
}

export function createBlockedFriendQueryRecord(
  index = 1,
  overrides: Partial<BlockedFriendQueryRecord> = {},
): BlockedFriendQueryRecord {
  return {
    ...createFriendQueryRecord(index),
    blockedAt: `2026-08-06 11:00:${String(index).padStart(2, '0')}.000000`,
    ...overrides,
  };
}

export function createBlockedFriendQueryRecords(
  count: number,
): BlockedFriendQueryRecord[] {
  return Array.from({ length: count }, (_, index) =>
    createBlockedFriendQueryRecord(index + 1),
  );
}
