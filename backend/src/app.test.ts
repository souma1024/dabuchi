import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { PaymentRequestParticipantNotFoundError } from './application/createPaymentRequests.js';
import { TransferParticipantNotFoundError } from './application/createTransfer.js';
import type {
  NewTransfer,
  TransferRepository,
} from './domain/transferRepository.js';
import { encodeRecipientCursor } from './presentation/http/recipientCursorCodec.js';
import { createTestApp } from './test/factories/appFactory.js';
import { createCurrentUser } from './test/factories/currentUserFactory.js';
import {
  createUserRecipientRecord,
  createUserRecipientRecords,
} from './test/factories/userRecipientFactory.js';
import { createUserRecipientRepository } from './test/factories/userRecipientRepositoryFactory.js';

const CURRENT_USER_ID = '11111111-1111-4111-8111-111111111111';
const MOCK_USER_ID = 'friend-001';

class InMemoryTransferRepository implements TransferRepository {
  transfers: NewTransfer[] = [];
  error: Error | null = null;

  save(transfer: NewTransfer) {
    if (this.error) {
      return Promise.reject(this.error);
    }

    this.transfers.push(transfer);
    return Promise.resolve({ id: this.transfers.length, ...transfer });
  }
}

function createTransferTestApp(repository: TransferRepository) {
  return createTestApp({ transferRepository: repository }).app;
}

describe('backend application', () => {
  it('ヘルスチェックで稼働状態を返す', async () => {
    const { app } = createTestApp();
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('未定義のパスに404を返す', async () => {
    const { app } = createTestApp();
    const response = await request(app).get('/unknown');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Not Found' });
  });

  it('mockログイン中のユーザーをホーム表示用の4項目で返す', async () => {
    const currentUser = createCurrentUser();
    const { app, currentUserRepository } = createTestApp({ currentUser });

    const response = await request(app).get('/api/me');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ user: currentUser });
    expect(currentUserRepository.findByUserId).toHaveBeenCalledWith(
      MOCK_USER_ID,
    );
  });

  it('mockログインユーザーが存在しなければ404を返す', async () => {
    const { app } = createTestApp({ currentUser: null });

    const response = await request(app).get('/api/me');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: 'CURRENT_USER_NOT_FOUND',
        message: 'Current user was not found.',
      },
    });
  });

  it('送る相手候補を20件と次ページ情報で返す', async () => {
    const records = createUserRecipientRecords(21);
    const { app } = createTestApp({ recipients: records });

    const response = await request(app).get(
      `/api/users/${CURRENT_USER_ID}/recipients`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      users: records
        .slice(0, 20)
        .map(({ id, name, profileUrl }) => ({ id, name, profileUrl })),
      pageInfo: {
        nextCursor: encodeRecipientCursor({
          sort: 'created-asc',
          value: {
            createdAt: createUserRecipientRecord(20).createdAt,
            id: createUserRecipientRecord(20).id,
          },
        }),
        hasNextPage: true,
      },
    });
  });

  it('次ページのカーソルを検索条件として使う', async () => {
    const cursor = {
      sort: 'created-asc' as const,
      value: {
        createdAt: '2026-08-04 12:00:20.000000',
        id: '00000000-0000-4000-8000-000000000020',
      },
    };
    const { app, repository } = createTestApp();

    const response = await request(app)
      .get(`/api/users/${CURRENT_USER_ID}/recipients`)
      .query({ cursor: encodeRecipientCursor(cursor) });

    expect(response.status).toBe(200);
    expect(repository.findRecipients).toHaveBeenCalledWith({
      currentUserId: CURRENT_USER_ID,
      cursor,
      limit: 21,
      sort: 'created-asc',
    });
  });

  it('sort=name-ascを検索条件として使う', async () => {
    const { app, repository } = createTestApp();

    const response = await request(app)
      .get(`/api/users/${CURRENT_USER_ID}/recipients`)
      .query({ sort: 'name-asc' });

    expect(response.status).toBe(200);
    expect(repository.findRecipients).toHaveBeenCalledWith({
      currentUserId: CURRENT_USER_ID,
      cursor: null,
      limit: 21,
      sort: 'name-asc',
    });
  });

  it('UUIDでない現在ユーザーIDを400にする', async () => {
    const { app } = createTestApp();

    const response = await request(app).get('/api/users/not-a-uuid/recipients');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'INVALID_REQUEST',
        message: 'currentUserId must be a UUID.',
      },
    });
  });

  it('不正なカーソルを400にする', async () => {
    const { app } = createTestApp();

    const response = await request(app)
      .get(`/api/users/${CURRENT_USER_ID}/recipients`)
      .query({ cursor: 'invalid' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: 'INVALID_REQUEST', message: 'cursor is invalid.' },
    });
  });

  it('不正なsortを400にする', async () => {
    const { app } = createTestApp();

    const response = await request(app)
      .get(`/api/users/${CURRENT_USER_ID}/recipients`)
      .query({ sort: 'unknown' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'INVALID_REQUEST',
        message: 'sort must be one of created-asc, created-desc or name-asc.',
      },
    });
  });

  it('sortと一致しないカーソルを400にする', async () => {
    const { app } = createTestApp();
    const cursor = {
      sort: 'name-asc' as const,
      value: {
        name: '佐藤 花子',
        id: '00000000-0000-4000-8000-000000000020',
      },
    };

    const response = await request(app)
      .get(`/api/users/${CURRENT_USER_ID}/recipients`)
      .query({ sort: 'created-asc', cursor: encodeRecipientCursor(cursor) });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: 'INVALID_REQUEST', message: 'cursor is invalid.' },
    });
  });

  it('現在ユーザーが存在しなければ404にする', async () => {
    const { app } = createTestApp({ currentUserExists: false });

    const response = await request(app).get(
      `/api/users/${CURRENT_USER_ID}/recipients`,
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: 'CURRENT_USER_NOT_FOUND',
        message: 'Current user was not found.',
      },
    });
  });

  it('想定外のエラー詳細をレスポンスへ含めない', async () => {
    const repository = createUserRecipientRepository();
    vi.mocked(repository.existsById).mockRejectedValue(
      new Error('database detail'),
    );
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const { app } = createTestApp({ repository });

    const response = await request(app).get(
      `/api/users/${CURRENT_USER_ID}/recipients`,
    );

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred.',
      },
    });
    const responseBody: unknown = response.body;
    expect(JSON.stringify(responseBody)).not.toContain('database detail');
    consoleError.mockRestore();
  });

  it('送信者ID、受取人IDと金額を保存する', async () => {
    const repository = new InMemoryTransferRepository();
    const senderId = '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001';
    const recipientId = '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf002';
    const response = await request(createTransferTestApp(repository))
      .post('/api/transfers')
      .send({ senderId, recipientId, amount: 1500 });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: 1,
      senderId,
      recipientId,
      amount: 1500,
    });
    expect(repository.transfers).toEqual([
      { senderId, recipientId, amount: 1500 },
    ]);
  });

  const senderId = '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001';
  const recipientId = '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf002';
  it.each([
    [{ recipientId, amount: 1500 }, 'senderId'],
    [{ senderId: 'invalid', recipientId, amount: 1500 }, 'senderId'],
    [{ senderId, amount: 1500 }, 'recipientId'],
    [{ senderId, recipientId: senderId, amount: 1500 }, 'different'],
    [{ senderId, recipientId, amount: 0 }, 'amount'],
    [{ senderId, recipientId, amount: 10.5 }, 'amount'],
  ])('不正な入力に400を返す: %j', async (body, expectedError) => {
    const repository = new InMemoryTransferRepository();
    const response = await request(createTransferTestApp(repository))
      .post('/api/transfers')
      .send(body);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'INVALID_REQUEST',
        message: expect.stringContaining(expectedError) as string,
      },
    });
    expect(repository.transfers).toEqual([]);
  });

  it('存在しない送信者または受取人なら422を返す', async () => {
    const repository = new InMemoryTransferRepository();
    repository.error = new TransferParticipantNotFoundError();

    const response = await request(createTransferTestApp(repository))
      .post('/api/transfers')
      .send({
        senderId,
        recipientId,
        amount: 1500,
      });

    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      error: {
        code: 'TRANSFER_PARTICIPANT_NOT_FOUND',
        message: 'senderId or recipientId was not found.',
      },
    });
  });

  it('server側current userを請求者として複数人分を保存する', async () => {
    const { app, currentUserRepository, paymentRequestRepository } =
      createTestApp();
    const response = await request(app)
      .post('/api/payment-requests')
      .send({
        requesterId: '99999999-9999-4999-8999-999999999999',
        requests: [
          {
            recipientId: '22222222-2222-4222-8222-222222222222',
            amount: 1_500,
          },
          {
            recipientId: '33333333-3333-4333-8333-333333333333',
            amount: 2_800,
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      requests: [
        {
          id: '00000000-0000-4000-8000-000000000001',
          requesterId: CURRENT_USER_ID,
          recipientId: '22222222-2222-4222-8222-222222222222',
          amount: 1_500,
          status: 'pending',
        },
        {
          id: '00000000-0000-4000-8000-000000000002',
          requesterId: CURRENT_USER_ID,
          recipientId: '33333333-3333-4333-8333-333333333333',
          amount: 2_800,
          status: 'pending',
        },
      ],
    });
    expect(currentUserRepository.findByUserId).toHaveBeenCalledWith(
      MOCK_USER_ID,
    );
    expect(paymentRequestRepository.saveAll).toHaveBeenCalledWith([
      {
        id: '00000000-0000-4000-8000-000000000001',
        requesterId: CURRENT_USER_ID,
        recipientId: '22222222-2222-4222-8222-222222222222',
        amount: 1_500,
      },
      {
        id: '00000000-0000-4000-8000-000000000002',
        requesterId: CURRENT_USER_ID,
        recipientId: '33333333-3333-4333-8333-333333333333',
        amount: 2_800,
      },
    ]);
  });

  it('不正な請求入力に共通形式の400を返す', async () => {
    const { app, paymentRequestRepository } = createTestApp();
    const response = await request(app)
      .post('/api/payment-requests')
      .send({ requests: [] });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'INVALID_REQUEST',
        message: 'requests must contain at least one item.',
      },
    });
    expect(paymentRequestRepository.saveAll).not.toHaveBeenCalled();
  });

  it('mock current userが存在しなければ404を返す', async () => {
    const { app } = createTestApp({ currentUser: null });
    const response = await request(app)
      .post('/api/payment-requests')
      .send({
        requests: [
          {
            recipientId: '22222222-2222-4222-8222-222222222222',
            amount: 1_500,
          },
        ],
      });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: 'CURRENT_USER_NOT_FOUND',
        message: 'Current user was not found.',
      },
    });
  });

  it('存在しない被請求者が含まれていれば422を返す', async () => {
    const { app, paymentRequestRepository } = createTestApp();
    vi.mocked(paymentRequestRepository.saveAll).mockRejectedValue(
      new PaymentRequestParticipantNotFoundError(),
    );

    const response = await request(app)
      .post('/api/payment-requests')
      .send({
        requests: [
          {
            recipientId: '99999999-9999-4999-8999-999999999999',
            amount: 1_500,
          },
        ],
      });

    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      error: {
        code: 'PAYMENT_REQUEST_PARTICIPANT_NOT_FOUND',
        message: 'One or more recipients were not found.',
      },
    });
  });
});
