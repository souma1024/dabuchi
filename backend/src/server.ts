import { createApp } from './app.js';
import { ListUserRecipients } from './application/usecases/listUserRecipients.js';
import { createDatabasePool } from './infrastructure/database/createDatabasePool.js';
import { loadDatabaseConfig } from './infrastructure/database/databaseConfig.js';
import { MysqlTransferRepository } from './infrastructure/mysqlTransferRepository.js';
import { MysqlUserRecipientRepository } from './infrastructure/repositories/mysqlUserRecipientRepository.js';
import { getErrorMessage } from './shared/errorMessage.js';

const port = Number(process.env.PORT ?? 3000);

if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  console.error('Invalid PORT configuration.');
  process.exitCode = 1;
} else {
  try {
    const databaseConfig = loadDatabaseConfig(process.env);
    const pool = createDatabasePool(databaseConfig);
    const repository = new MysqlUserRecipientRepository(pool);
    const listUserRecipients = new ListUserRecipients(repository);
    const transferRepository = new MysqlTransferRepository(pool);
    const server = createApp({
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
    console.error(
      'Backend database configuration is invalid.',
      getErrorMessage(error),
    );
    process.exitCode = 1;
  }
}
