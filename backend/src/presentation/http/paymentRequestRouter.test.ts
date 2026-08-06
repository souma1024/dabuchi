import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { CreatePaymentRequests } from '../../application/createPaymentRequests.js';
import { ListPaymentRequests } from '../../application/usecases/listPaymentRequests.js';
import { createPaymentRequestListRepository } from '../../test/factories/paymentRequestListFactory.js';
import { createCurrentUser } from '../../test/factories/currentUserFactory.js';
import { createCurrentUserRepository } from '../../test/factories/currentUserRepositoryFactory.js';
import { createPaymentRequestRepository } from '../../test/factories/paymentRequestRepositoryFactory.js';
import { createPaymentRequestRouter } from './paymentRequestRouter.js';

const CURRENT_USER_PUBLIC_ID = 'friend-001';
const CURRENT_USER_INTERNAL_ID = '11111111-1111-4111-8111-111111111111';
const RECIPIENT_ID = '22222222-2222-4222-8222-222222222222';
const PAYMENT_REQUEST_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function createRouterTestApp() {
  const currentUserRepository = createCurrentUserRepository({
    user: createCurrentUser({ id: CURRENT_USER_INTERNAL_ID }),
  });
  const paymentRequestRepository = createPaymentRequestRepository();
  const createPaymentRequests = new CreatePaymentRequests(
    currentUserRepository,
    paymentRequestRepository,
    () => PAYMENT_REQUEST_ID,
  );
  const app = express();

  app.use(express.json());
  app.use(
    '/api/payment-requests',
    createPaymentRequestRouter(
      createPaymentRequests,
      CURRENT_USER_PUBLIC_ID,
      new ListPaymentRequests(
        currentUserRepository,
        createPaymentRequestListRepository(),
      ),
    ),
  );
  app.use(
    (
      error: unknown,
      _request: express.Request,
      response: express.Response,
      _next: express.NextFunction,
    ) => {
      void _next;
      response.status(599).json({ forwardedError: String(error) });
    },
  );

  return { app, currentUserRepository, paymentRequestRepository };
}

describe('paymentRequestRouter', () => {
  it('current userをrequest bodyから受け取らず請求を作成する', async () => {
    const { app, currentUserRepository, paymentRequestRepository } =
      createRouterTestApp();

    const response = await request(app)
      .post('/api/payment-requests')
      .send({ requests: [{ recipientId: RECIPIENT_ID, amount: 1_500 }] });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      requests: [
        {
          id: PAYMENT_REQUEST_ID,
          requesterId: CURRENT_USER_INTERNAL_ID,
          recipientId: RECIPIENT_ID,
          amount: 1_500,
          status: 'pending',
        },
      ],
    });
    expect(currentUserRepository.findByUserId).toHaveBeenCalledWith(
      CURRENT_USER_PUBLIC_ID,
    );
    expect(paymentRequestRepository.saveAll).toHaveBeenCalledOnce();
  });

  it('application errorを共通error handlerへ渡す', async () => {
    const { app, paymentRequestRepository } = createRouterTestApp();

    const response = await request(app)
      .post('/api/payment-requests')
      .send({ requests: [] });

    expect(response.status).toBe(599);
    expect(response.body).toEqual({
      forwardedError: 'Error: requests must contain at least one item.',
    });
    expect(paymentRequestRepository.saveAll).not.toHaveBeenCalled();
  });
});
