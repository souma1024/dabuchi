import express from 'express';

import type { ListUserRecipients } from './application/usecases/listUserRecipients.js';
import { errorHandler } from './presentation/http/errorHandler.js';
import { healthRouter } from './presentation/http/healthRouter.js';
import { createUserRecipientRouter } from './presentation/http/userRecipientRouter.js';
import type { TransferRepository } from './domain/transferRepository.js';
import { createMysqlPool } from './infrastructure/mysqlPool.js';
import { MysqlTransferRepository } from './infrastructure/mysqlTransferRepository.js';
import { createTransferRouter } from './presentation/http/transferRouter.js';

export interface AppDependencies {
  listUserRecipients: ListUserRecipients;
}

export function createApp(
  transferRepository: TransferRepository = new MysqlTransferRepository(
    createMysqlPool(),
  ),
  dependencies: AppDependencies,
) {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use('/health', healthRouter);
  app.use(
    '/api/users',
    createUserRecipientRouter(dependencies.listUserRecipients),
  );
  app.use('/api/transfers', createTransferRouter(transferRepository));

  app.use((_request, response) => {
    response.status(404).json({ error: 'Not Found' });
  });

  app.use(errorHandler);

  return app;
}
