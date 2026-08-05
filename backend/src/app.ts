import express from 'express';

import type { CreatePaymentRequests } from './application/createPaymentRequests.js';
import type { GetCurrentUser } from './application/usecases/getCurrentUser.js';
import type { ListUserRecipients } from './application/usecases/listUserRecipients.js';
import type { TransferRepository } from './domain/transferRepository.js';
import { createCurrentUserRouter } from './presentation/http/currentUserRouter.js';
import { errorHandler } from './presentation/http/errorHandler.js';
import { healthRouter } from './presentation/http/healthRouter.js';
import { createPaymentRequestRouter } from './presentation/http/paymentRequestRouter.js';
import { createUserRecipientRouter } from './presentation/http/userRecipientRouter.js';
import { createTransferRouter } from './presentation/http/transferRouter.js';

export interface AppDependencies {
  createPaymentRequests: CreatePaymentRequests;
  getCurrentUser: GetCurrentUser;
  currentUserId: string;
  listUserRecipients: ListUserRecipients;
  transferRepository: TransferRepository;
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
  app.use(
    '/api/transfers',
    createTransferRouter(dependencies.transferRepository),
  );
  app.use(
    '/api/payment-requests',
    createPaymentRequestRouter(
      dependencies.createPaymentRequests,
      dependencies.currentUserId,
    ),
  );

  app.use((_request, response) => {
    response.status(404).json({ error: 'Not Found' });
  });

  app.use(errorHandler);

  return app;
}
