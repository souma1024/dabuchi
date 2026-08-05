import express from 'express';

import type { GetCurrentUser } from './application/usecases/getCurrentUser.js';
import type { ListUserRecipients } from './application/usecases/listUserRecipients.js';
import { createCurrentUserRouter } from './presentation/http/currentUserRouter.js';
import { errorHandler } from './presentation/http/errorHandler.js';
import { healthRouter } from './presentation/http/healthRouter.js';
import { createUserRecipientRouter } from './presentation/http/userRecipientRouter.js';

export interface AppDependencies {
  getCurrentUser: GetCurrentUser;
  currentUserId: string;
  listUserRecipients: ListUserRecipients;
}

export function createApp(dependencies: AppDependencies) {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use('/health', healthRouter);
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

  app.use((_request, response) => {
    response.status(404).json({ error: 'Not Found' });
  });

  app.use(errorHandler);

  return app;
}
