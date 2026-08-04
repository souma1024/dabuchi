import express from 'express';

import type { ListUserRecipients } from './application/usecases/listUserRecipients.js';
import { errorHandler } from './presentation/http/errorHandler.js';
import { healthRouter } from './presentation/http/healthRouter.js';
import { createUserRecipientRouter } from './presentation/http/userRecipientRouter.js';

export interface AppDependencies {
  listUserRecipients: ListUserRecipients;
}

export function createApp(dependencies: AppDependencies) {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use('/health', healthRouter);
  app.use(
    '/api/users',
    createUserRecipientRouter(dependencies.listUserRecipients),
  );

  app.use((_request, response) => {
    response.status(404).json({ error: 'Not Found' });
  });

  app.use(errorHandler);

  return app;
}
