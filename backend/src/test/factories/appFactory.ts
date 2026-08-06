import type { TransferRepository } from '../../domain/transferRepository.js';
import { createApp } from '../../app.js';
import {
  CreatePaymentRequests,
  type PaymentRequestIdGenerator,
} from '../../application/createPaymentRequests.js';
import type { CurrentUserRepository } from '../../application/ports/currentUserRepository.js';
import type { FriendCommandRepository } from '../../application/ports/friendCommandRepository.js';
import type { FriendQueryRepository } from '../../application/ports/friendQueryRepository.js';
import type { TransactionRepository } from '../../application/ports/transactionRepository.js';
import type { UserRecipientRepository } from '../../application/ports/userRecipientRepository.js';
import { AddFriend } from '../../application/usecases/addFriend.js';
import { BlockFriend } from '../../application/usecases/blockFriend.js';
import { CreateFriendshipNote } from '../../application/usecases/createFriendshipNote.js';
import { DeleteFriendshipNote } from '../../application/usecases/deleteFriendshipNote.js';
import { GetCurrentUser } from '../../application/usecases/getCurrentUser.js';
import { GetFriendshipDetail } from '../../application/usecases/getFriendshipDetail.js';
import { ListBlockedFriends } from '../../application/usecases/listBlockedFriends.js';
import { ListFriends } from '../../application/usecases/listFriends.js';
import { ListUserRecipients } from '../../application/usecases/listUserRecipients.js';
import { ListUserTransactions } from '../../application/usecases/listUserTransactions.js';
import { UnblockFriend } from '../../application/usecases/unblockFriend.js';
import { UpdateFriendshipNote } from '../../application/usecases/updateFriendshipNote.js';
import type { CurrentUser } from '../../domain/currentUser.js';
import type { PaymentRequestRepository } from '../../domain/paymentRequestRepository.js';
import type { TransactionRecord } from '../../domain/transaction.js';
import type { UserRecipientRecord } from '../../domain/userRecipient.js';
import { createCurrentUserRepository } from './currentUserRepositoryFactory.js';
import { createFriendCommandRepository } from './friendCommandRepositoryFactory.js';
import { createFriendQueryRepository } from './friendQueryRepositoryFactory.js';
import { createPaymentRequestRepository } from './paymentRequestRepositoryFactory.js';
import { createTransactionRepository } from './transactionRepositoryFactory.js';
import { createUserRecipientRepository } from './userRecipientRepositoryFactory.js';

interface AppFactoryOptions {
  currentUser?: CurrentUser | null;
  currentUserId?: string;
  currentUserRepository?: CurrentUserRepository;
  currentUserExists?: boolean;
  friendCommandRepository?: FriendCommandRepository;
  friendQueryRepository?: FriendQueryRepository;
  paymentRequestIdGenerator?: PaymentRequestIdGenerator;
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
  const listUserTransactions = new ListUserTransactions(
    currentUserRepository,
    transactionRepository,
  );
  const transferRepository: TransferRepository =
    options.transferRepository ??
    ({
      save: () => Promise.reject(new Error('Transfer repository was not set.')),
    } satisfies TransferRepository);

  const friendCommandRepository =
    options.friendCommandRepository ?? createFriendCommandRepository();
  const friendQueryRepository =
    options.friendQueryRepository ?? createFriendQueryRepository();
  let generatedFriendshipId = 0;

  return {
    app: createApp({
      addFriend: new AddFriend(
        currentUserRepository,
        friendCommandRepository,
        () =>
          `10000000-0000-4000-8000-${String(++generatedFriendshipId).padStart(12, '0')}`,
      ),
      blockFriend: new BlockFriend(
        currentUserRepository,
        friendCommandRepository,
      ),
      createFriendshipNote: new CreateFriendshipNote(
        currentUserRepository,
        friendCommandRepository,
      ),
      createPaymentRequests,
      currentUserId: options.currentUserId ?? 'friend-001',
      deleteFriendshipNote: new DeleteFriendshipNote(
        currentUserRepository,
        friendCommandRepository,
      ),
      getCurrentUser,
      getFriendshipDetail: new GetFriendshipDetail(
        currentUserRepository,
        friendQueryRepository,
      ),
      listBlockedFriends: new ListBlockedFriends(
        currentUserRepository,
        friendQueryRepository,
      ),
      listFriends: new ListFriends(
        currentUserRepository,
        friendQueryRepository,
      ),
      listUserRecipients,
      listUserTransactions,
      transferRepository,
      unblockFriend: new UnblockFriend(
        currentUserRepository,
        friendCommandRepository,
      ),
      updateFriendshipNote: new UpdateFriendshipNote(
        currentUserRepository,
        friendCommandRepository,
      ),
    }),
    currentUserRepository,
    friendCommandRepository,
    friendQueryRepository,
    paymentRequestRepository,
    repository,
    transactionRepository,
  };
}
