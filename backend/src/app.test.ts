import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { PaymentRequestParticipantNotFoundError } from './application/createPaymentRequests.js';
import {
  IdempotencyKeyConflictError,
  InsufficientBalanceError,
  TransferParticipantNotFoundError,
} from './application/createTransfer.js';
import {
  PaymentRequestAlreadyRespondedError,
  PaymentRequestForbiddenError,
  PaymentRequestNotFoundError,
} from './application/errors/paymentRequestCommandErrors.js';
import type {
  NewTransfer,
  TransferRepository,
} from './domain/transferRepository.js';
import { encodePaymentRequestCursor } from './presentation/http/paymentRequestCursorCodec.js';
import { encodeRecipientCursor } from './presentation/http/recipientCursorCodec.js';
import { encodeTransactionCursor } from './presentation/http/transactionCursorCodec.js';
import type { TransactionRecord } from './domain/transaction.js';
import { mysqlDateTimeToIso } from './shared/mysqlDateTime.js';
import { createTestApp } from './test/factories/appFactory.js';
import { createCurrentUser } from './test/factories/currentUserFactory.js';
import {
  createBlockedFriendQueryRecords,
  createFriendQueryRecords,
} from './test/factories/friendQueryFactory.js';
import { createFriendQueryRepository } from './test/factories/friendQueryRepositoryFactory.js';
import {
  createPaymentRequestCommandRepository,
  createRespondedPaymentRequest,
} from './test/factories/paymentRequestCommandFactory.js';
import {
  createPaymentRequestListRepository,
  createPaymentRequestRecord,
  createPaymentRequestRecords,
} from './test/factories/paymentRequestListFactory.js';
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
const PAYMENT_REQUEST_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

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
    // 友達追加で使う公開user_idも返す。
    expect(response.body).toEqual({ user: currentUser });
    expect(response.body).toMatchObject({ user: { userId: 'friend-001' } });
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

  it('友達一覧をログイン中ユーザーの内部UUIDで検索して返す', async () => {
    const records = createFriendQueryRecords(1);
    const { app, friendQueryRepository } = createTestApp({
      friendQueryRepository: createFriendQueryRepository({ friends: records }),
    });

    const response = await request(app).get('/api/friends');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      friends: [
        {
          friendshipId: records[0]?.friendshipId,
          friend: records[0]?.friend,
          addedBy: records[0]?.addedBy,
          addedAt: '2026-08-06T10:00:01.000Z',
          note: records[0]?.note,
        },
      ],
      pageInfo: { nextCursor: null, hasNextPage: false },
    });
    // clientはユーザーを指定できず、server解決の内部UUIDで検索される
    expect(friendQueryRepository.findFriends).toHaveBeenCalledWith({
      currentUserId: CURRENT_USER_ID,
      cursor: null,
      limit: 21,
    });
  });

  it('ブロック中の友達一覧を返す', async () => {
    const records = createBlockedFriendQueryRecords(1);
    const { app } = createTestApp({
      friendQueryRepository: createFriendQueryRepository({
        blockedFriends: records,
      }),
    });

    const response = await request(app).get('/api/friends/blocked');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      friends: [{ friendshipId: records[0]?.friendshipId }],
      pageInfo: { hasNextPage: false },
    });
  });

  it('友達を追加して201を返す', async () => {
    const { app } = createTestApp();

    const response = await request(app)
      .post('/api/friends')
      .send({ friendUserId: 'friend-002' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      friendship: { friend: { userId: 'friend-002' } },
    });
  });

  it('存在しない友達関係の詳細を404にする', async () => {
    const { app } = createTestApp({
      friendQueryRepository: createFriendQueryRepository({ detail: null }),
    });

    const response = await request(app).get(
      '/api/friends/10000000-0000-4000-8000-000000000001',
    );

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      error: { code: 'FRIENDSHIP_NOT_FOUND' },
    });
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
  // response.bodyはanyのため、unknown経由で必要な形だけに絞ってから参照する。
  function asPaymentRequestListBody(body: unknown) {
    return body as {
      requests: unknown[];
      pageInfo: { nextCursor: string | null; hasNextPage: boolean };
    };
  }

  function asPaymentRequestResponseBody(body: unknown) {
    return body as { request: { status: string }; balance?: number };
  }

  function asErrorBody(body: unknown) {
    return body as { error: { code: string; message: string } };
  }

  it('請求一覧を20件と次ページ情報で返す', async () => {
    const { app } = createTestApp({
      currentUser: createCurrentUser({ id: CURRENT_USER_ID }),
      paymentRequestRecords: createPaymentRequestRecords(21),
    });

    const response = await request(app).get(
      '/api/payment-requests?direction=received',
    );
    const body = asPaymentRequestListBody(response.body);

    expect(response.status).toBe(200);
    expect(body.requests).toHaveLength(20);
    expect(body.pageInfo.hasNextPage).toBe(true);
    expect(typeof body.pageInfo.nextCursor).toBe('string');
  });

  it('請求1件を相手・金額・状態・日時で返す', async () => {
    const record = createPaymentRequestRecord(1, {
      amount: 3000,
      status: 'accepted',
      createdAt: '2026-08-03 01:00:00.000000',
      respondedAt: '2026-08-04 02:30:00.500000',
    });
    const { app } = createTestApp({
      currentUser: createCurrentUser({ id: CURRENT_USER_ID }),
      paymentRequestRecords: [record],
    });

    const response = await request(app).get(
      '/api/payment-requests?direction=received',
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      requests: [
        {
          id: record.id,
          counterparty: {
            id: record.counterpartyId,
            name: record.counterpartyName,
            profileUrl: record.counterpartyProfileUrl,
          },
          amount: 3000,
          status: 'accepted',
          createdAt: '2026-08-03T01:00:00.000Z',
          respondedAt: '2026-08-04T02:30:00.500Z',
        },
      ],
      pageInfo: { nextCursor: null, hasNextPage: false },
    });
  });

  it('最終ページでは次ページ情報を空にする', async () => {
    const { app } = createTestApp({
      currentUser: createCurrentUser({ id: CURRENT_USER_ID }),
      paymentRequestRecords: createPaymentRequestRecords(20),
    });

    const response = await request(app).get(
      '/api/payment-requests?direction=received',
    );
    const body = asPaymentRequestListBody(response.body);

    expect(body.requests).toHaveLength(20);
    expect(body.pageInfo).toEqual({ nextCursor: null, hasNextPage: false });
  });

  it('次ページのカーソルを検索条件として使う', async () => {
    const cursor = {
      createdAt: '2026-08-04 12:00:20.000000',
      id: '00000000-0000-4000-8000-000000000020',
    };
    const paymentRequestListRepository = createPaymentRequestListRepository();
    const { app } = createTestApp({
      currentUser: createCurrentUser({ id: CURRENT_USER_ID }),
      paymentRequestListRepository,
    });

    const response = await request(app)
      .get('/api/payment-requests')
      .query({
        direction: 'sent',
        status: 'pending',
        cursor: encodePaymentRequestCursor(cursor),
      });

    expect(response.status).toBe(200);
    expect(
      paymentRequestListRepository.findPaymentRequests,
    ).toHaveBeenCalledWith({
      currentUserInternalId: CURRENT_USER_ID,
      direction: 'sent',
      status: 'pending',
      cursor,
      limit: 21,
    });
  });

  it.each([
    ['directionを指定しない', '', 'direction must be "received" or "sent"'],
    [
      'directionが不正',
      '?direction=both',
      'direction must be "received" or "sent"',
    ],
    [
      'statusが不正',
      '?direction=received&status=bogus',
      'status must be "pending", "accepted" or "rejected"',
    ],
    [
      'カーソルが復号できない',
      '?direction=received&cursor=not-base64url',
      'cursor is invalid',
    ],
    // 正しいカーソルへ1文字足しただけの値が200で通ってしまわないことを確かめる。
    [
      'カーソルへ非base64url文字が混ざっている',
      `?direction=received&cursor=${encodeURIComponent(
        `${encodePaymentRequestCursor({
          createdAt: '2026-08-04 12:00:20.000000',
          id: '00000000-0000-4000-8000-000000000020',
        })}!`,
      )}`,
      'cursor is invalid',
    ],
  ])('請求一覧で%sときは400にする', async (_name, query, message) => {
    const { app } = createTestApp({
      currentUser: createCurrentUser({ id: CURRENT_USER_ID }),
    });

    const response = await request(app).get(`/api/payment-requests${query}`);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: 'INVALID_REQUEST', message },
    });
  });

  it('請求一覧で現在ユーザーが存在しなければ404にする', async () => {
    const { app } = createTestApp({ currentUser: null });

    const response = await request(app).get(
      '/api/payment-requests?direction=received',
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: 'CURRENT_USER_NOT_FOUND',
        message: 'Current user was not found.',
      },
    });
  });

  it('請求を承認し、確定後の請求と残高を返す', async () => {
    const paymentRequestCommandRepository =
      createPaymentRequestCommandRepository({
        responded: createRespondedPaymentRequest({
          id: PAYMENT_REQUEST_ID,
          amount: 3000,
          status: 'accepted',
          respondedAt: '2026-08-06 02:00:00.000000',
          recipientBalance: 117000,
        }),
      });
    const { app } = createTestApp({
      currentUser: createCurrentUser({ id: CURRENT_USER_ID }),
      paymentRequestCommandRepository,
    });

    const response = await request(app).post(
      `/api/payment-requests/${PAYMENT_REQUEST_ID}/accept`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      request: {
        id: PAYMENT_REQUEST_ID,
        amount: 3000,
        status: 'accepted',
        respondedAt: '2026-08-06T02:00:00.000Z',
      },
      balance: 117000,
    });
    expect(paymentRequestCommandRepository.respond).toHaveBeenCalledWith({
      paymentRequestId: PAYMENT_REQUEST_ID,
      currentUserInternalId: CURRENT_USER_ID,
      response: 'accepted',
    });
  });

  it('請求を拒否し、残高を返さない', async () => {
    const { app } = createTestApp({
      currentUser: createCurrentUser({ id: CURRENT_USER_ID }),
      paymentRequestCommandRepository: createPaymentRequestCommandRepository({
        responded: createRespondedPaymentRequest({
          id: PAYMENT_REQUEST_ID,
          status: 'rejected',
          recipientBalance: null,
        }),
      }),
    });

    const response = await request(app).post(
      `/api/payment-requests/${PAYMENT_REQUEST_ID}/reject`,
    );

    const body = asPaymentRequestResponseBody(response.body);

    expect(response.status).toBe(200);
    expect(body.balance).toBeUndefined();
    expect(body.request.status).toBe('rejected');
  });

  it.each([
    [
      '存在しない請求',
      new PaymentRequestNotFoundError(),
      404,
      'PAYMENT_REQUEST_NOT_FOUND',
    ],
    [
      '被請求者でない',
      new PaymentRequestForbiddenError(),
      403,
      'PAYMENT_REQUEST_FORBIDDEN',
    ],
    [
      'すでに応答済み',
      new PaymentRequestAlreadyRespondedError(),
      409,
      'PAYMENT_REQUEST_ALREADY_RESPONDED',
    ],
    ['残高不足', new InsufficientBalanceError(), 422, 'INSUFFICIENT_BALANCE'],
  ])('承認の%sを%dにする', async (_name, error, status, code) => {
    const { app } = createTestApp({
      currentUser: createCurrentUser({ id: CURRENT_USER_ID }),
      paymentRequestCommandRepository: createPaymentRequestCommandRepository({
        error,
      }),
    });

    const response = await request(app).post(
      `/api/payment-requests/${PAYMENT_REQUEST_ID}/accept`,
    );

    expect(response.status).toBe(status);
    expect(asErrorBody(response.body).error.code).toBe(code);
  });

  it('請求IDがUUIDでなければ400にする', async () => {
    const paymentRequestCommandRepository =
      createPaymentRequestCommandRepository();
    const { app } = createTestApp({
      currentUser: createCurrentUser({ id: CURRENT_USER_ID }),
      paymentRequestCommandRepository,
    });

    const response = await request(app).post(
      '/api/payment-requests/not-a-uuid/accept',
    );

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: 'INVALID_REQUEST', message: 'id must be a UUID' },
    });
    expect(paymentRequestCommandRepository.respond).not.toHaveBeenCalled();
  });

  it('承認で現在ユーザーが存在しなければ404にする', async () => {
    const { app } = createTestApp({ currentUser: null });

    const response = await request(app).post(
      `/api/payment-requests/${PAYMENT_REQUEST_ID}/accept`,
    );

    expect(response.status).toBe(404);
    expect(asErrorBody(response.body).error.code).toBe(
      'CURRENT_USER_NOT_FOUND',
    );
  });
});
