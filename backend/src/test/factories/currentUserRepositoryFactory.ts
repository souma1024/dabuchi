import { vi } from 'vitest';

import type { CurrentUserRepository } from '../../application/ports/currentUserRepository.js';
import type { CurrentUser } from '../../domain/currentUser.js';
import { createCurrentUser } from './currentUserFactory.js';

interface CurrentUserRepositoryFactoryOptions {
  user?: CurrentUser | null;
}

export function createCurrentUserRepository(
  options: CurrentUserRepositoryFactoryOptions = {},
): CurrentUserRepository {
  return {
    findByUserId: vi
      .fn<CurrentUserRepository['findByUserId']>()
      .mockResolvedValue(
        options.user === undefined ? createCurrentUser() : options.user,
      ),
  };
}
