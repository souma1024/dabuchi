import type { TransferRepository } from '../../domain/transferRepository.js';
import { createApp } from '../../app.js';
import type { CurrentUserRepository } from '../../application/ports/currentUserRepository.js';
import type { TransactionRepository } from '../../application/ports/transactionRepository.js';
import type { UserRecipientRepository } from '../../application/ports/userRecipientRepository.js';
import { GetCurrentUser } from '../../application/usecases/getCurrentUser.js';
import { ListUserRecipients } from '../../application/usecases/listUserRecipients.js';
import { ListUserTransactions } from '../../application/usecases/listUserTransactions.js';
import type { CurrentUser } from '../../domain/currentUser.js';
import type { TransactionRecord } from '../../domain/transaction.js';
import type { UserRecipientRecord } from '../../domain/userRecipient.js';
import { createCurrentUserRepository } from './currentUserRepositoryFactory.js';
import { createTransactionRepository } from './transactionRepositoryFactory.js';
import { createUserRecipientRepository } from './userRecipientRepositoryFactory.js';

interface AppFactoryOptions {
  currentUser?: CurrentUser | null;
  currentUserId?: string;
  currentUserRepository?: CurrentUserRepository;
  currentUserExists?: boolean;
  recipients?: UserRecipientRecord[];
  repository?: UserRecipientRepository;
  transactions?: TransactionRecord[];
  transactionRepository?: TransactionRepository;
  transferRepository?: TransferRepository;
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
  const transactionRepository =
    options.transactionRepository ??
    createTransactionRepository({
      currentUserExists: options.currentUserExists,
      transactions: options.transactions,
    });
  const getCurrentUser = new GetCurrentUser(currentUserRepository);
  const listUserRecipients = new ListUserRecipients(repository);
  const listUserTransactions = new ListUserTransactions(transactionRepository);
  const transferRepository: TransferRepository =
    options.transferRepository ??
    ({
      save: () => Promise.reject(new Error('Transfer repository was not set.')),
    } satisfies TransferRepository);

  return {
    app: createApp({
      currentUserId: options.currentUserId ?? 'friend-001',
      getCurrentUser,
      listUserRecipients,
      listUserTransactions,
      transferRepository,
    }),
    currentUserRepository,
    repository,
    transactionRepository,
  };
}
