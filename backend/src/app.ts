import { existsSync } from 'node:fs';
import path from 'node:path';

import express from 'express';

import type { CreatePaymentRequests } from './application/createPaymentRequests.js';
import type { AuthRepository } from './application/ports/authRepository.js';
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
import { createAuthentication } from './presentation/http/authentication.js';
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
  authRepository: AuthRepository;
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
  // 以降のAPIはセッションから現在ユーザーを解決する。認証が要るかは各routerが決める。
  app.use('/api', createAuthentication(dependencies.authRepository));
  app.use('/api/me', createCurrentUserRouter(dependencies.getCurrentUser));
  app.use(
    '/api/users',
    createUserRecipientRouter(dependencies.listUserRecipients),
  );
  // 友達APIは現在ユーザーを公開user_idからserver側で解決するため、pathにユーザーを含めない。
  app.use(
    '/api/friends',
    createAddFriendRouter(dependencies.addFriend),
    createFriendshipNoteRouter({
      createFriendshipNote: dependencies.createFriendshipNote,
      deleteFriendshipNote: dependencies.deleteFriendshipNote,
      updateFriendshipNote: dependencies.updateFriendshipNote,
    }),
    createFriendBlockRouter({
      blockFriend: dependencies.blockFriend,
      unblockFriend: dependencies.unblockFriend,
    }),
    createFriendQueryRouter({
      getFriendshipDetail: dependencies.getFriendshipDetail,
      listBlockedFriends: dependencies.listBlockedFriends,
      listFriends: dependencies.listFriends,
    }),
  );
  app.use(
    '/api/transactions',
    createUserTransactionRouter(dependencies.listUserTransactions),
  );
  app.use(
    '/api/transfers',
    createTransferRouter(dependencies.transferRepository),
  );
  app.use(
    '/api/payment-requests',
    createPaymentRequestRouter({
      createPaymentRequests: dependencies.createPaymentRequests,
      getPaymentRequest: dependencies.getPaymentRequest,
      listPaymentRequests: dependencies.listPaymentRequests,
      respondToPaymentRequest: dependencies.respondToPaymentRequest,
    }),
  );

  // 本番はフロントを同じオリジンから配信する。別オリジンにするとCookieを
  // SameSite=Noneへ緩めCORSも要るため、経路を分けない方が守りやすい。
  const frontendDirectory = process.env.FRONTEND_DIST_PATH;

  if (frontendDirectory !== undefined && existsSync(frontendDirectory)) {
    app.use(express.static(frontendDirectory));

    // SPAのルーティングはclient側にあるため、APIで拾えなかったGETはindex.htmlを返す。
    app.get(/^\/(?!api\/|health).*/, (_request, response) => {
      response.sendFile(path.join(frontendDirectory, 'index.html'));
    });
  }

  app.use((_request, response) => {
    response.status(404).json({ error: 'Not Found' });
  });

  app.use(errorHandler);

  return app;
}
