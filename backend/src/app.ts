import express from 'express';

import type { CreatePaymentRequests } from './application/createPaymentRequests.js';
import type { AddFriend } from './application/usecases/addFriend.js';
import type { BlockFriend } from './application/usecases/blockFriend.js';
import type { CreateFriendshipNote } from './application/usecases/createFriendshipNote.js';
import type { DeleteFriendshipNote } from './application/usecases/deleteFriendshipNote.js';
import type { GetCurrentUser } from './application/usecases/getCurrentUser.js';
import type { LogIn } from './application/usecases/logIn.js';
import type { LogOut } from './application/usecases/logOut.js';
import type { SignUp } from './application/usecases/signUp.js';
import type { GetFriendshipDetail } from './application/usecases/getFriendshipDetail.js';
import type { ListBlockedFriends } from './application/usecases/listBlockedFriends.js';
import type { ListFriends } from './application/usecases/listFriends.js';
import type { GetPaymentRequest } from './application/usecases/getPaymentRequest.js';
import type { ListPaymentRequests } from './application/usecases/listPaymentRequests.js';
import type { RespondToPaymentRequest } from './application/usecases/respondToPaymentRequest.js';
import type { ListUserRecipients } from './application/usecases/listUserRecipients.js';
import type { ListUserTransactions } from './application/usecases/listUserTransactions.js';
import type { UnblockFriend } from './application/usecases/unblockFriend.js';
import type { UpdateFriendshipNote } from './application/usecases/updateFriendshipNote.js';
import type { TransferRepository } from './domain/transferRepository.js';
import { createAddFriendRouter } from './presentation/http/addFriendRouter.js';
import { createAuthRouter } from './presentation/http/authRouter.js';
import { createCurrentUserRouter } from './presentation/http/currentUserRouter.js';
import { errorHandler } from './presentation/http/errorHandler.js';
import { createFriendBlockRouter } from './presentation/http/friendBlockRouter.js';
import { createFriendQueryRouter } from './presentation/http/friendQueryRouter.js';
import { createFriendshipNoteRouter } from './presentation/http/friendshipNoteRouter.js';
import { healthRouter } from './presentation/http/healthRouter.js';
import { createPaymentRequestRouter } from './presentation/http/paymentRequestRouter.js';
import { createUserRecipientRouter } from './presentation/http/userRecipientRouter.js';
import { createUserTransactionRouter } from './presentation/http/userTransactionRouter.js';
import { createTransferRouter } from './presentation/http/transferRouter.js';

export interface AppDependencies {
  addFriend: AddFriend;
  logIn: LogIn;
  logOut: LogOut;
  signUp: SignUp;
  blockFriend: BlockFriend;
  createFriendshipNote: CreateFriendshipNote;
  createPaymentRequests: CreatePaymentRequests;
  deleteFriendshipNote: DeleteFriendshipNote;
  getCurrentUser: GetCurrentUser;
  getFriendshipDetail: GetFriendshipDetail;
  getPaymentRequest: GetPaymentRequest;
  /** mock認証で決まる現在ユーザーの公開user_id。内部UUIDはserver側で解決する。 */
  currentUserId: string;
  listBlockedFriends: ListBlockedFriends;
  listFriends: ListFriends;
  listPaymentRequests: ListPaymentRequests;
  listUserRecipients: ListUserRecipients;
  listUserTransactions: ListUserTransactions;
  respondToPaymentRequest: RespondToPaymentRequest;
  transferRepository: TransferRepository;
  unblockFriend: UnblockFriend;
  updateFriendshipNote: UpdateFriendshipNote;
}

export function createApp(dependencies: AppDependencies) {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use('/health', healthRouter);
  app.use(
    '/api/auth',
    createAuthRouter({
      logIn: dependencies.logIn,
      logOut: dependencies.logOut,
      signUp: dependencies.signUp,
    }),
  );
  app.use(
    '/api/me',
    createCurrentUserRouter(
      dependencies.getCurrentUser,
      dependencies.currentUserId,
    ),
  );
  app.use(
    '/api/users',
    createUserRecipientRouter(dependencies.listUserRecipients),
  );
  // 友達APIは現在ユーザーを公開user_idからserver側で解決するため、pathにユーザーを含めない。
  app.use(
    '/api/friends',
    createAddFriendRouter(dependencies.addFriend, dependencies.currentUserId),
    createFriendshipNoteRouter({
      createFriendshipNote: dependencies.createFriendshipNote,
      currentUserPublicId: dependencies.currentUserId,
      deleteFriendshipNote: dependencies.deleteFriendshipNote,
      updateFriendshipNote: dependencies.updateFriendshipNote,
    }),
    createFriendBlockRouter({
      blockFriend: dependencies.blockFriend,
      currentUserPublicId: dependencies.currentUserId,
      unblockFriend: dependencies.unblockFriend,
    }),
    createFriendQueryRouter({
      currentUserPublicId: dependencies.currentUserId,
      getFriendshipDetail: dependencies.getFriendshipDetail,
      listBlockedFriends: dependencies.listBlockedFriends,
      listFriends: dependencies.listFriends,
    }),
  );
  app.use(
    '/api/transactions',
    createUserTransactionRouter(
      dependencies.listUserTransactions,
      dependencies.currentUserId,
    ),
  );
  app.use(
    '/api/transfers',
    createTransferRouter(dependencies.transferRepository),
  );
  app.use(
    '/api/payment-requests',
    createPaymentRequestRouter({
      createPaymentRequests: dependencies.createPaymentRequests,
      currentUserPublicId: dependencies.currentUserId,
      getPaymentRequest: dependencies.getPaymentRequest,
      listPaymentRequests: dependencies.listPaymentRequests,
      respondToPaymentRequest: dependencies.respondToPaymentRequest,
    }),
  );

  app.use((_request, response) => {
    response.status(404).json({ error: 'Not Found' });
  });

  app.use(errorHandler);

  return app;
}
