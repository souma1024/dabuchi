import { vi } from 'vitest';

import type {
  FriendQueryRecord,
  FriendQueryRepository,
} from '../../application/ports/friendQueryRepository.js';

interface FriendQueryRepositoryFactoryOptions {
  friends?: FriendQueryRecord[];
}

export function createFriendQueryRepository(
  options: FriendQueryRepositoryFactoryOptions = {},
): FriendQueryRepository {
  return {
    findFriends: vi
      .fn<FriendQueryRepository['findFriends']>()
      .mockResolvedValue(options.friends ?? []),
  };
}
