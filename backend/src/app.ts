import express from 'express';

import { healthRouter } from './presentation/http/healthRouter.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use('/health', healthRouter);

  app.use((_request, response) => {
    response.status(404).json({ error: 'Not Found' });
  });

  return app;
}
