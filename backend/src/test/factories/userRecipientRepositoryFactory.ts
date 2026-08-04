import { vi } from 'vitest';

import type { UserRecipientRepository } from '../../application/ports/userRecipientRepository.js';
import type { UserRecipientRecord } from '../../domain/userRecipient.js';

interface RepositoryFactoryOptions {
  currentUserExists?: boolean;
  recipients?: UserRecipientRecord[];
}

export function createUserRecipientRepository(
  options: RepositoryFactoryOptions = {},
): UserRecipientRepository {
  return {
    existsById: vi
      .fn<UserRecipientRepository['existsById']>()
      .mockResolvedValue(options.currentUserExists ?? true),
    findRecipients: vi
      .fn<UserRecipientRepository['findRecipients']>()
      .mockResolvedValue(options.recipients ?? []),
  };
}
