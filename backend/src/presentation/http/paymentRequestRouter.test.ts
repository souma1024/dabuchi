import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { CreatePaymentRequests } from '../../application/createPaymentRequests.js';
import { GetPaymentRequest } from '../../application/usecases/getPaymentRequest.js';
import { ListPaymentRequests } from '../../application/usecases/listPaymentRequests.js';
import { RespondToPaymentRequest } from '../../application/usecases/respondToPaymentRequest.js';
import {
  createPaymentRequestCommandRepository,
  createRespondedPaymentRequest,
} from '../../test/factories/paymentRequestCommandFactory.js';
import { createPaymentRequestListRepository } from '../../test/factories/paymentRequestListFactory.js';
import { createCurrentUser } from '../../test/factories/currentUserFactory.js';
import { createCurrentUserRepository } from '../../test/factories/currentUserRepositoryFactory.js';
import { createPaymentRequestRepository } from '../../test/factories/paymentRequestRepositoryFactory.js';
import { createPaymentRequestRouter } from './paymentRequestRouter.js';

const CURRENT_USER_PUBLIC_ID = 'friend-001';
const CURRENT_USER_INTERNAL_ID = '11111111-1111-4111-8111-111111111111';
const RECIPIENT_ID = '22222222-2222-4222-8222-222222222222';
const PAYMENT_REQUEST_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function createRouterTestApp(
  paymentRequestCommandRepository = createPaymentRequestCommandRepository(),
) {
  const currentUserRepository = createCurrentUserRepository({
    user: createCurrentUser({ id: CURRENT_USER_INTERNAL_ID }),
  });
  const paymentRequestRepository = createPaymentRequestRepository();
  const createPaymentRequests = new CreatePaymentRequests(
    currentUserRepository,
    paymentRequestRepository,
    () => PAYMENT_REQUEST_ID,
  );
  const paymentRequestListRepository = createPaymentRequestListRepository();
  const app = express();

  app.use(express.json());
  app.use(
    '/api/payment-requests',
    createPaymentRequestRouter({
      createPaymentRequests,
      currentUserPublicId: CURRENT_USER_PUBLIC_ID,
      getPaymentRequest: new GetPaymentRequest(
        currentUserRepository,
        paymentRequestListRepository,
      ),
      listPaymentRequests: new ListPaymentRequests(
        currentUserRepository,
        paymentRequestListRepository,
      ),
      respondToPaymentRequest: new RespondToPaymentRequest(
        currentUserRepository,
        paymentRequestCommandRepository,
      ),
    }),
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

  it('承認は残高付きで返し、被請求者本人として実行する', async () => {
    const commandRepository = createPaymentRequestCommandRepository();
    const { app } = createRouterTestApp(commandRepository);

    const response = await request(app).post(
      `/api/payment-requests/${PAYMENT_REQUEST_ID}/accept`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      request: {
        id: '00000000-0000-4000-8000-000000000001',
        amount: 3000,
        status: 'accepted',
        respondedAt: '2026-08-06T02:00:00.000Z',
      },
      balance: 117000,
    });
    expect(commandRepository.respond).toHaveBeenCalledWith({
      paymentRequestId: PAYMENT_REQUEST_ID,
      currentUserInternalId: CURRENT_USER_INTERNAL_ID,
      response: 'accepted',
    });
  });

  it('拒否は残高を返さない', async () => {
    const commandRepository = createPaymentRequestCommandRepository({
      responded: createRespondedPaymentRequest({
        status: 'rejected',
        recipientBalance: null,
      }),
    });
    const { app } = createRouterTestApp(commandRepository);

    const response = await request(app).post(
      `/api/payment-requests/${PAYMENT_REQUEST_ID}/reject`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      request: {
        id: '00000000-0000-4000-8000-000000000001',
        amount: 3000,
        status: 'rejected',
        respondedAt: '2026-08-06T02:00:00.000Z',
      },
    });
    expect(commandRepository.respond).toHaveBeenCalledWith(
      expect.objectContaining({ response: 'rejected' }),
    );
  });

  it('請求IDがUUIDでなければrepositoryを呼ばずerror handlerへ渡す', async () => {
    const commandRepository = createPaymentRequestCommandRepository();
    const { app } = createRouterTestApp(commandRepository);

    const response = await request(app).post(
      '/api/payment-requests/not-a-uuid/accept',
    );

    expect(response.status).toBe(599);
    expect(commandRepository.respond).not.toHaveBeenCalled();
  });
});
