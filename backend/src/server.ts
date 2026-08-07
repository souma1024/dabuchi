import { randomUUID } from 'node:crypto';

import { createApp } from './app.js';
import { CreatePaymentRequests } from './application/createPaymentRequests.js';
import { AddFriend } from './application/usecases/addFriend.js';
import { BlockFriend } from './application/usecases/blockFriend.js';
import { CreateFriendshipNote } from './application/usecases/createFriendshipNote.js';
import { DeleteFriendshipNote } from './application/usecases/deleteFriendshipNote.js';
import { GetCurrentUser } from './application/usecases/getCurrentUser.js';
import { LogIn } from './application/usecases/logIn.js';
import { LogOut } from './application/usecases/logOut.js';
import { SignUp } from './application/usecases/signUp.js';
import { GetFriendshipDetail } from './application/usecases/getFriendshipDetail.js';
import { ListBlockedFriends } from './application/usecases/listBlockedFriends.js';
import { ListFriends } from './application/usecases/listFriends.js';
import { GetPaymentRequest } from './application/usecases/getPaymentRequest.js';
import { ListPaymentRequests } from './application/usecases/listPaymentRequests.js';
import { RespondToPaymentRequest } from './application/usecases/respondToPaymentRequest.js';
import { ListUserRecipients } from './application/usecases/listUserRecipients.js';
import { ListUserTransactions } from './application/usecases/listUserTransactions.js';
import { UnblockFriend } from './application/usecases/unblockFriend.js';
import { UpdateFriendshipNote } from './application/usecases/updateFriendshipNote.js';
import { createDatabasePool } from './infrastructure/database/createDatabasePool.js';
import { loadDatabaseConfig } from './infrastructure/database/databaseConfig.js';
import { MysqlPaymentRequestRepository } from './infrastructure/mysqlPaymentRequestRepository.js';
import { MysqlTransferRepository } from './infrastructure/mysqlTransferRepository.js';
import { MysqlAuthRepository } from './infrastructure/repositories/mysqlAuthRepository.js';
import { MysqlCurrentUserRepository } from './infrastructure/repositories/mysqlCurrentUserRepository.js';
import { MysqlFriendCommandRepository } from './infrastructure/repositories/mysqlFriendCommandRepository.js';
import { MysqlFriendQueryRepository } from './infrastructure/repositories/mysqlFriendQueryRepository.js';
import { MysqlPaymentRequestCommandRepository } from './infrastructure/repositories/mysqlPaymentRequestCommandRepository.js';
import { MysqlPaymentRequestListRepository } from './infrastructure/repositories/mysqlPaymentRequestListRepository.js';
import { MysqlUserRecipientRepository } from './infrastructure/repositories/mysqlUserRecipientRepository.js';
import { MysqlTransactionRepository } from './infrastructure/repositories/mysqlTransactionRepository.js';
import { getErrorMessage } from './shared/errorMessage.js';

const port = Number(process.env.PORT ?? 3000);

if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  console.error('Invalid PORT configuration.');
  process.exitCode = 1;
} else {
  try {
    const databaseConfig = loadDatabaseConfig(process.env);
    const pool = createDatabasePool(databaseConfig);
    const currentUserRepository = new MysqlCurrentUserRepository(pool);
    const userRecipientRepository = new MysqlUserRecipientRepository(pool);
    const paymentRequestRepository = new MysqlPaymentRequestRepository(pool);
    const transactionRepository = new MysqlTransactionRepository(pool);
    const transferRepository = new MysqlTransferRepository(pool);
    const createPaymentRequests = new CreatePaymentRequests(
      currentUserRepository,
      paymentRequestRepository,
      randomUUID,
    );
    const friendCommandRepository = new MysqlFriendCommandRepository(pool);
    const friendQueryRepository = new MysqlFriendQueryRepository(pool);
    const authRepository = new MysqlAuthRepository(pool);
    const logIn = new LogIn(authRepository);
    const logOut = new LogOut(authRepository);
    const signUp = new SignUp(authRepository, randomUUID);
    const getCurrentUser = new GetCurrentUser(currentUserRepository);
    const addFriend = new AddFriend(
      currentUserRepository,
      friendCommandRepository,
      randomUUID,
    );
    const blockFriend = new BlockFriend(
      currentUserRepository,
      friendCommandRepository,
    );
    const unblockFriend = new UnblockFriend(
      currentUserRepository,
      friendCommandRepository,
    );
    const createFriendshipNote = new CreateFriendshipNote(
      currentUserRepository,
      friendCommandRepository,
    );
    const updateFriendshipNote = new UpdateFriendshipNote(
      currentUserRepository,
      friendCommandRepository,
    );
    const deleteFriendshipNote = new DeleteFriendshipNote(
      currentUserRepository,
      friendCommandRepository,
    );
    const listFriends = new ListFriends(
      currentUserRepository,
      friendQueryRepository,
    );
    const listBlockedFriends = new ListBlockedFriends(
      currentUserRepository,
      friendQueryRepository,
    );
    const getFriendshipDetail = new GetFriendshipDetail(
      currentUserRepository,
      friendQueryRepository,
    );
    const listUserRecipients = new ListUserRecipients(userRecipientRepository);
    const paymentRequestListRepository = new MysqlPaymentRequestListRepository(
      pool,
    );
    const listPaymentRequests = new ListPaymentRequests(
      currentUserRepository,
      paymentRequestListRepository,
    );
    const getPaymentRequest = new GetPaymentRequest(
      currentUserRepository,
      paymentRequestListRepository,
    );
    const listUserTransactions = new ListUserTransactions(
      currentUserRepository,
      transactionRepository,
    );
    const respondToPaymentRequest = new RespondToPaymentRequest(
      currentUserRepository,
      new MysqlPaymentRequestCommandRepository(pool),
    );
    const server = createApp({
      addFriend,
      authRepository,
      blockFriend,
      createFriendshipNote,
      createPaymentRequests,
      deleteFriendshipNote,
      getCurrentUser,
      getFriendshipDetail,
      getPaymentRequest,
      listBlockedFriends,
      listFriends,
      listPaymentRequests,
      listUserRecipients,
      listUserTransactions,
      logIn,
      logOut,
      respondToPaymentRequest,
      signUp,
      transferRepository,
      unblockFriend,
      updateFriendshipNote,
    }).listen(port, () => {
      console.info(`Backend is listening on port ${port}.`);
    });

    server.on('error', (error: Error) => {
      console.error('Backend failed to start.', error);
      process.exitCode = 1;
    });
  } catch (error) {
    console.error('Backend configuration is invalid.', getErrorMessage(error));
    process.exitCode = 1;
  }
}
