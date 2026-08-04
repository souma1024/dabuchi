import { createApp } from '../../app.js';
import type { UserRecipientRepository } from '../../application/ports/userRecipientRepository.js';
import { ListUserRecipients } from '../../application/usecases/listUserRecipients.js';
import type { UserRecipientRecord } from '../../domain/userRecipient.js';
import { createUserRecipientRepository } from './userRecipientRepositoryFactory.js';

interface AppFactoryOptions {
  currentUserExists?: boolean;
  recipients?: UserRecipientRecord[];
  repository?: UserRecipientRepository;
}

export function createTestApp(options: AppFactoryOptions = {}) {
  const repository =
    options.repository ??
    createUserRecipientRepository({
      currentUserExists: options.currentUserExists,
      recipients: options.recipients,
    });
  const listUserRecipients = new ListUserRecipients(repository);

  return {
    app: createApp({ listUserRecipients }),
    repository,
  };
}
