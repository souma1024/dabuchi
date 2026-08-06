import type { TransferRepository } from '../../domain/transferRepository.js';
import { createApp } from '../../app.js';
import {
  CreatePaymentRequests,
  type PaymentRequestIdGenerator,
} from '../../application/createPaymentRequests.js';
import type { CurrentUserRepository } from '../../application/ports/currentUserRepository.js';
import type { PaymentRequestListRepository } from '../../application/ports/paymentRequestListRepository.js';
import type { TransactionRepository } from '../../application/ports/transactionRepository.js';
import type { UserRecipientRepository } from '../../application/ports/userRecipientRepository.js';
import { GetCurrentUser } from '../../application/usecases/getCurrentUser.js';
import { ListPaymentRequests } from '../../application/usecases/listPaymentRequests.js';
import { ListUserRecipients } from '../../application/usecases/listUserRecipients.js';
import { ListUserTransactions } from '../../application/usecases/listUserTransactions.js';
import type { CurrentUser } from '../../domain/currentUser.js';
import type { PaymentRequestRecord } from '../../domain/paymentRequest.js';
import type { PaymentRequestRepository } from '../../domain/paymentRequestRepository.js';
import type { TransactionRecord } from '../../domain/transaction.js';
import type { UserRecipientRecord } from '../../domain/userRecipient.js';
import { createCurrentUserRepository } from './currentUserRepositoryFactory.js';
import { createPaymentRequestListRepository } from './paymentRequestListFactory.js';
import { createPaymentRequestRepository } from './paymentRequestRepositoryFactory.js';
import { createTransactionRepository } from './transactionRepositoryFactory.js';
import { createUserRecipientRepository } from './userRecipientRepositoryFactory.js';

interface AppFactoryOptions {
  currentUser?: CurrentUser | null;
  currentUserId?: string;
  currentUserRepository?: CurrentUserRepository;
  currentUserExists?: boolean;
  paymentRequestIdGenerator?: PaymentRequestIdGenerator;
  paymentRequestListRepository?: PaymentRequestListRepository;
  paymentRequestRecords?: PaymentRequestRecord[];
  paymentRequestRepository?: PaymentRequestRepository;
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
      transactions: options.transactions,
    });
  const getCurrentUser = new GetCurrentUser(currentUserRepository);
  const listUserRecipients = new ListUserRecipients(repository);
  const paymentRequestRepository =
    options.paymentRequestRepository ?? createPaymentRequestRepository();
  let generatedId = 0;
  const createPaymentRequests = new CreatePaymentRequests(
    currentUserRepository,
    paymentRequestRepository,
    options.paymentRequestIdGenerator ??
      (() =>
        `00000000-0000-4000-8000-${String(++generatedId).padStart(12, '0')}`),
  );
  const paymentRequestListRepository =
    options.paymentRequestListRepository ??
    createPaymentRequestListRepository({
      records: options.paymentRequestRecords,
    });
  const listPaymentRequests = new ListPaymentRequests(
    currentUserRepository,
    paymentRequestListRepository,
  );
  const listUserTransactions = new ListUserTransactions(
    currentUserRepository,
    transactionRepository,
  );
  const transferRepository: TransferRepository =
    options.transferRepository ??
    ({
      save: () => Promise.reject(new Error('Transfer repository was not set.')),
    } satisfies TransferRepository);

  return {
    app: createApp({
      createPaymentRequests,
      currentUserId: options.currentUserId ?? 'friend-001',
      getCurrentUser,
      listPaymentRequests,
      listUserRecipients,
      listUserTransactions,
      transferRepository,
    }),
    currentUserRepository,
    paymentRequestListRepository,
    paymentRequestRepository,
    repository,
    transactionRepository,
  };
}
