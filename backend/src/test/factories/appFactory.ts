import { createApp } from '../../app.js';
import type { CurrentUserRepository } from '../../application/ports/currentUserRepository.js';
import type { UserRecipientRepository } from '../../application/ports/userRecipientRepository.js';
import { GetCurrentUser } from '../../application/usecases/getCurrentUser.js';
import { ListUserRecipients } from '../../application/usecases/listUserRecipients.js';
import type { CurrentUser } from '../../domain/currentUser.js';
import type { UserRecipientRecord } from '../../domain/userRecipient.js';
import { createCurrentUserRepository } from './currentUserRepositoryFactory.js';
import { createUserRecipientRepository } from './userRecipientRepositoryFactory.js';

interface AppFactoryOptions {
  currentUser?: CurrentUser | null;
  currentUserId?: string;
  currentUserRepository?: CurrentUserRepository;
  currentUserExists?: boolean;
  recipients?: UserRecipientRecord[];
  repository?: UserRecipientRepository;
}

export function createTestApp(options: AppFactoryOptions = {}) {
  const currentUserRepository =
    options.currentUserRepository ??
    createCurrentUserRepository({ user: options.currentUser });
  const repository =
    options.repository ??
    createUserRecipientRepository({
      currentUserExists: options.currentUserExists,
      recipients: options.recipients,
    });
  const getCurrentUser = new GetCurrentUser(currentUserRepository);
  const listUserRecipients = new ListUserRecipients(repository);

  return {
    app: createApp({
      currentUserId: options.currentUserId ?? 'friend-001',
      getCurrentUser,
      listUserRecipients,
    }),
    currentUserRepository,
    repository,
  };
}
