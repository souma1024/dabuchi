import { createApp } from './app.js';
import { GetCurrentUser } from './application/usecases/getCurrentUser.js';
import { ListUserRecipients } from './application/usecases/listUserRecipients.js';
import { loadMockAuthenticationConfig } from './infrastructure/auth/mockAuthenticationConfig.js';
import { createDatabasePool } from './infrastructure/database/createDatabasePool.js';
import { loadDatabaseConfig } from './infrastructure/database/databaseConfig.js';
import { MysqlTransferRepository } from './infrastructure/mysqlTransferRepository.js';
import { MysqlCurrentUserRepository } from './infrastructure/repositories/mysqlCurrentUserRepository.js';
import { MysqlUserRecipientRepository } from './infrastructure/repositories/mysqlUserRecipientRepository.js';
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
    const transferRepository = new MysqlTransferRepository(pool);
    const getCurrentUser = new GetCurrentUser(currentUserRepository);
    const listUserRecipients = new ListUserRecipients(userRecipientRepository);
    const server = createApp({
      currentUserId: authenticationConfig.currentUserId,
      getCurrentUser,
      listUserRecipients,
      transferRepository,
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
