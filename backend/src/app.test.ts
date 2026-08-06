import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { PaymentRequestParticipantNotFoundError } from './application/createPaymentRequests.js';
import {
  IdempotencyKeyConflictError,
  InsufficientBalanceError,
  TransferParticipantNotFoundError,
} from './application/createTransfer.js';
import type {
  NewTransfer,
  TransferRepository,
} from './domain/transferRepository.js';
import { encodeRecipientCursor } from './presentation/http/recipientCursorCodec.js';
import { encodeTransactionCursor } from './presentation/http/transactionCursorCodec.js';
import type { TransactionRecord } from './domain/transaction.js';
import { mysqlDateTimeToIso } from './shared/mysqlDateTime.js';
import { createTestApp } from './test/factories/appFactory.js';
import { createCurrentUser } from './test/factories/currentUserFactory.js';
import {
  createTransactionRecord,
  createTransactionRecords,
} from './test/factories/transactionFactory.js';
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
    return Promise.resolve({
      id: this.transfers.length,
      senderId: transfer.senderId,
      recipientId: transfer.recipientId,
      amount: transfer.amount,
    });
  }
}

function createTransferTestApp(repository: TransferRepository) {
  return createTestApp({ transferRepository: repository }).app;
}

function toTransactionResponse(record: TransactionRecord) {
  return {
    id: record.id,
    counterparty: {
      id: record.counterpartyId,
      name: record.counterpartyName,
      profileUrl: record.counterpartyProfileUrl,
    },
    amount: record.amount,
    direction: record.direction,
    createdAt: mysqlDateTimeToIso(record.createdAt),
  };
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
          createdAt: createUserRecipientRecord(20).createdAt,
          id: createUserRecipientRecord(20).id,
        }),
        hasNextPage: true,
      },
    });
  });

  it('次ページのカーソルを検索条件として使う', async () => {
    const cursor = {
      createdAt: '2026-08-04 12:00:20.000000',
      id: '00000000-0000-4000-8000-000000000020',
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

  it('ログイン中ユーザーの取引履歴を20件と次ページ情報で返す', async () => {
    const records = createTransactionRecords(21);
    const { app, transactionRepository } = createTestApp({
      transactions: records,
    });

    const response = await request(app).get('/api/transactions');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      transactions: records.slice(0, 20).map(toTransactionResponse),
      pageInfo: {
        nextCursor: encodeTransactionCursor({
          createdAt: createTransactionRecord(20).createdAt,
          id: createTransactionRecord(20).id,
        }),
        hasNextPage: true,
      },
    });
    // clientはユーザーを指定できず、server解決の内部UUIDで検索される
    expect(transactionRepository.findTransactions).toHaveBeenCalledWith({
      currentUserId: CURRENT_USER_ID,
      cursor: null,
      limit: 21,
    });
  });

  it('取引履歴のカーソルを検索条件として使う', async () => {
    const cursor = { createdAt: '2026-08-04 12:00:20.000000', id: '20' };
    const { app, transactionRepository } = createTestApp();

    const response = await request(app)
      .get('/api/transactions')
      .query({ cursor: encodeTransactionCursor(cursor) });

    expect(response.status).toBe(200);
    expect(transactionRepository.findTransactions).toHaveBeenCalledWith({
      currentUserId: CURRENT_USER_ID,
      cursor,
      limit: 21,
    });
  });

  it('取引履歴で不正なカーソルを400にする', async () => {
    const { app } = createTestApp();

    const response = await request(app)
      .get('/api/transactions')
      .query({ cursor: 'invalid' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: 'INVALID_REQUEST', message: 'cursor is invalid.' },
    });
  });

  it('ログイン中ユーザーが存在しなければ取引履歴を404にする', async () => {
    const { app } = createTestApp({ currentUser: null });

    const response = await request(app).get('/api/transactions');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: 'CURRENT_USER_NOT_FOUND',
        message: 'Current user was not found.',
      },
    });
  });

  it('取引履歴エンドポイントはURLでのユーザー指定を受け付けない', async () => {
    const { app } = createTestApp({
      transactions: createTransactionRecords(1),
    });

    const response = await request(app).get(
      `/api/users/${CURRENT_USER_ID}/transactions`,
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Not Found' });
  });

  it('送信者ID、受取人IDと金額を保存する', async () => {
    const repository = new InMemoryTransferRepository();
    const senderId = '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001';
    const recipientId = '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf002';
    const response = await request(createTransferTestApp(repository))
      .post('/api/transfers')
      .set('Idempotency-Key', 'idem-key-1')
      .send({ senderId, recipientId, amount: 1500 });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: 1,
      senderId,
      recipientId,
      amount: 1500,
    });
    expect(repository.transfers).toEqual([
      { senderId, recipientId, amount: 1500, idempotencyKey: 'idem-key-1' },
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
      .set('Idempotency-Key', 'idem-key-1')
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

  it('Idempotency-Keyヘッダが無ければ400を返す', async () => {
    const repository = new InMemoryTransferRepository();
    const response = await request(createTransferTestApp(repository))
      .post('/api/transfers')
      .send({ senderId, recipientId, amount: 1500 });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'INVALID_REQUEST',
        message: expect.stringContaining('Idempotency-Key') as string,
      },
    });
    expect(repository.transfers).toEqual([]);
  });

  it('残高不足なら422を返す', async () => {
    const repository = new InMemoryTransferRepository();
    repository.error = new InsufficientBalanceError();

    const response = await request(createTransferTestApp(repository))
      .post('/api/transfers')
      .set('Idempotency-Key', 'idem-key-1')
      .send({ senderId, recipientId, amount: 1500 });

    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      error: {
        code: 'INSUFFICIENT_BALANCE',
        message: 'sender does not have enough balance.',
      },
    });
  });

  it('冪等キーが別内容に再利用されたら409を返す', async () => {
    const repository = new InMemoryTransferRepository();
    repository.error = new IdempotencyKeyConflictError();

    const response = await request(createTransferTestApp(repository))
      .post('/api/transfers')
      .set('Idempotency-Key', 'idem-key-1')
      .send({ senderId, recipientId, amount: 1500 });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: {
        code: 'IDEMPOTENCY_KEY_CONFLICT',
        message: 'idempotencyKey was reused for a different transfer.',
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
