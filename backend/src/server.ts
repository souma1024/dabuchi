import { randomUUID } from 'node:crypto';

import { createApp } from './app.js';
import { CreatePaymentRequests } from './application/createPaymentRequests.js';
import { AddFriend } from './application/usecases/addFriend.js';
import { BlockFriend } from './application/usecases/blockFriend.js';
import { CreateFriendshipNote } from './application/usecases/createFriendshipNote.js';
import { DeleteFriendshipNote } from './application/usecases/deleteFriendshipNote.js';
import { GetCurrentUser } from './application/usecases/getCurrentUser.js';
import { GetFriendshipDetail } from './application/usecases/getFriendshipDetail.js';
import { ListBlockedFriends } from './application/usecases/listBlockedFriends.js';
import { ListFriends } from './application/usecases/listFriends.js';
import { ListPaymentRequests } from './application/usecases/listPaymentRequests.js';
import { ListUserRecipients } from './application/usecases/listUserRecipients.js';
import { ListUserTransactions } from './application/usecases/listUserTransactions.js';
import { UnblockFriend } from './application/usecases/unblockFriend.js';
import { UpdateFriendshipNote } from './application/usecases/updateFriendshipNote.js';
import { loadMockAuthenticationConfig } from './infrastructure/auth/mockAuthenticationConfig.js';
import { createDatabasePool } from './infrastructure/database/createDatabasePool.js';
import { loadDatabaseConfig } from './infrastructure/database/databaseConfig.js';
import { MysqlPaymentRequestRepository } from './infrastructure/mysqlPaymentRequestRepository.js';
import { MysqlTransferRepository } from './infrastructure/mysqlTransferRepository.js';
import { MysqlCurrentUserRepository } from './infrastructure/repositories/mysqlCurrentUserRepository.js';
import { MysqlFriendCommandRepository } from './infrastructure/repositories/mysqlFriendCommandRepository.js';
import { MysqlFriendQueryRepository } from './infrastructure/repositories/mysqlFriendQueryRepository.js';
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
    const authenticationConfig = loadMockAuthenticationConfig(process.env);
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
    const listPaymentRequests = new ListPaymentRequests(
      currentUserRepository,
      new MysqlPaymentRequestListRepository(pool),
    );
    const listUserTransactions = new ListUserTransactions(
      currentUserRepository,
      transactionRepository,
    );
    const server = createApp({
      addFriend,
      blockFriend,
      createFriendshipNote,
      createPaymentRequests,
      currentUserId: authenticationConfig.currentUserId,
      deleteFriendshipNote,
      getCurrentUser,
      getFriendshipDetail,
      listBlockedFriends,
      listFriends,
      listPaymentRequests,
      listUserRecipients,
      listUserTransactions,
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
