import { vi } from 'vitest';

import type {
  FriendQueryRecord,
  FriendQueryRepository,
  FriendshipDetailQueryRecord,
} from '../../application/ports/friendQueryRepository.js';

interface FriendQueryRepositoryFactoryOptions {
  friends?: FriendQueryRecord[];
  detail?: FriendshipDetailQueryRecord | null;
}

export function createFriendQueryRepository(
  options: FriendQueryRepositoryFactoryOptions = {},
): FriendQueryRepository {
  return {
    findFriends: vi
      .fn<FriendQueryRepository['findFriends']>()
      .mockResolvedValue(options.friends ?? []),
    findFriendshipDetail: vi
      .fn<FriendQueryRepository['findFriendshipDetail']>()
      .mockResolvedValue(options.detail ?? null),
  };
}
