import type { FriendProfile } from '../../domain/friendship.js';
import type { FriendQueryRecord } from '../../application/ports/friendQueryRepository.js';

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
