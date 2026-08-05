import { Router } from 'express';

import type { CreatePaymentRequests } from '../../application/createPaymentRequests.js';

export function createPaymentRequestRouter(
  createPaymentRequests: CreatePaymentRequests,
  currentUserId: string,
) {
  const router = Router();

  router.post('/', async (request, response, next) => {
    try {
      const paymentRequests = await createPaymentRequests.execute(
        currentUserId,
        request.body,
      );
      response.status(201).json({ requests: paymentRequests });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
