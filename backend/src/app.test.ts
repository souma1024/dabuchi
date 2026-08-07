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
} from './application/errors/paymentRequestErrors.js';
import type {
  NewTransfer,
  TransferRepository,
} from './domain/transferRepository.js';
import { encodePaymentRequestCursor } from './presentation/http/paymentRequestCursorCodec.js';
import { encodeRecipientCursor } from './presentation/http/recipientCursorCodec.js';
import { encodeTransactionCursor } from './presentation/http/transactionCursorCodec.js';
import type { TransactionRecord } from './domain/transaction.js';
import { hashPassword } from './domain/password.js';
import { hashSessionToken } from './domain/session.js';
import { mysqlDateTimeToIso } from './shared/mysqlDateTime.js';
import {
  createTestApp,
  TEST_SESSION_COOKIE,
} from './test/factories/appFactory.js';
import { createAuthRepository } from './test/factories/authRepositoryFactory.js';
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
  createPaymentRequestQueryRepository,
  createPaymentRequestRecord,
  createPaymentRequestRecords,
} from './test/factories/paymentRequestQueryFactory.js';
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
// セッションが指すユーザーの公開user_id。
const MOCK_USER_ID = 'friend-001';
const PAYMENT_REQUEST_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const FRIENDSHIP_ID = '10000000-0000-4000-8000-000000000001';
const PASSWORD = 'correct horse battery';
// 毎回ハッシュ化すると遅くなるため、テスト内で一度だけ作る。
const PASSWORD_HASH = await hashPassword(PASSWORD);

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

    const response = await request(app)
      .get('/api/me')
      .set('Cookie', TEST_SESSION_COOKIE);

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

    const response = await request(app)
      .get('/api/me')
      .set('Cookie', TEST_SESSION_COOKIE);

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

    const response = await request(app)
      .get(`/api/users/${CURRENT_USER_ID}/recipients`)
      .set('Cookie', TEST_SESSION_COOKIE);

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
      .set('Cookie', TEST_SESSION_COOKIE)
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
      .set('Cookie', TEST_SESSION_COOKIE)
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

    const response = await request(app)
      .get('/api/users/not-a-uuid/recipients')
      .set('Cookie', TEST_SESSION_COOKIE);

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
      .set('Cookie', TEST_SESSION_COOKIE)
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
      .set('Cookie', TEST_SESSION_COOKIE)
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
      .set('Cookie', TEST_SESSION_COOKIE)
      .query({ sort: 'created-asc', cursor: encodeRecipientCursor(cursor) });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: 'INVALID_REQUEST', message: 'cursor is invalid.' },
    });
  });

  it('現在ユーザーが存在しなければ404にする', async () => {
    const { app } = createTestApp({ currentUserExists: false });

    const response = await request(app)
      .get(`/api/users/${CURRENT_USER_ID}/recipients`)
      .set('Cookie', TEST_SESSION_COOKIE);

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

    const response = await request(app)
      .get(`/api/users/${CURRENT_USER_ID}/recipients`)
      .set('Cookie', TEST_SESSION_COOKIE);

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

    const response = await request(app)
      .get('/api/transactions')
      .set('Cookie', TEST_SESSION_COOKIE);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      transactions: records.slice(0, 20).map(toTransactionResponse),
      pageInfo: {
        nextCursor: encodeTransactionCursor({
          sort: 'created-desc',
          value: {
            createdAt: createTransactionRecord(20).createdAt,
            id: createTransactionRecord(20).id,
          },
        }),
        hasNextPage: true,
      },
    });
    // clientはユーザーを指定できず、server解決の内部UUIDで検索される
    expect(transactionRepository.findTransactions).toHaveBeenCalledWith({
      currentUserId: CURRENT_USER_ID,
      cursor: null,
      limit: 21,
      sort: 'created-desc',
    });
  });

  it('取引履歴のカーソルを検索条件として使う', async () => {
    const cursor = {
      sort: 'created-asc' as const,
      value: { createdAt: '2026-08-04 12:00:20.000000', id: '20' },
    };
    const { app, transactionRepository } = createTestApp();

    const response = await request(app)
      .get('/api/transactions')
      .set('Cookie', TEST_SESSION_COOKIE)
      .query({ sort: 'created-asc', cursor: encodeTransactionCursor(cursor) });

    expect(response.status).toBe(200);
    expect(transactionRepository.findTransactions).toHaveBeenCalledWith({
      currentUserId: CURRENT_USER_ID,
      cursor,
      limit: 21,
      sort: 'created-asc',
    });
  });

  it('取引履歴で不正なカーソルを400にする', async () => {
    const { app } = createTestApp();

    const response = await request(app)
      .get('/api/transactions')
      .set('Cookie', TEST_SESSION_COOKIE)
      .query({ cursor: 'invalid' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: 'INVALID_REQUEST', message: 'cursor is invalid.' },
    });
  });

  it('取引履歴で不正なsortを400にする', async () => {
    const { app } = createTestApp();

    const response = await request(app)
      .get('/api/transactions')
      .query({ sort: 'unknown' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'INVALID_REQUEST',
        message: 'sort must be one of created-asc or created-desc.',
      },
    });
  });

  it('取引履歴でsortと一致しないカーソルを400にする', async () => {
    const { app } = createTestApp();
    const cursor = {
      sort: 'created-desc' as const,
      value: { createdAt: '2026-08-04 12:00:20.000000', id: '20' },
    };

    const response = await request(app)
      .get('/api/transactions')
      .query({ sort: 'created-asc', cursor: encodeTransactionCursor(cursor) });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: 'INVALID_REQUEST', message: 'cursor is invalid.' },
    });
  });

  it('ログイン中ユーザーが存在しなければ取引履歴を404にする', async () => {
    const { app } = createTestApp({ currentUser: null });

    const response = await request(app)
      .get('/api/transactions')
      .set('Cookie', TEST_SESSION_COOKIE);

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

    const response = await request(app)
      .get(`/api/users/${CURRENT_USER_ID}/transactions`)
      .set('Cookie', TEST_SESSION_COOKIE);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Not Found' });
  });

  it('友達一覧をログイン中ユーザーの内部UUIDで検索して返す', async () => {
    const records = createFriendQueryRecords(1);
    const { app, friendQueryRepository } = createTestApp({
      friendQueryRepository: createFriendQueryRepository({ friends: records }),
    });

    const response = await request(app)
      .get('/api/friends')
      .set('Cookie', TEST_SESSION_COOKIE);

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

    const response = await request(app)
      .get('/api/friends/blocked')
      .set('Cookie', TEST_SESSION_COOKIE);

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
      .set('Cookie', TEST_SESSION_COOKIE)
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

    const response = await request(app)
      .get('/api/friends/10000000-0000-4000-8000-000000000001')
      .set('Cookie', TEST_SESSION_COOKIE);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      error: { code: 'FRIENDSHIP_NOT_FOUND' },
    });
  });

  it('セッションのユーザーを送信者として保存する', async () => {
    const repository = new InMemoryTransferRepository();
    const recipientId = '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf002';
    const response = await request(createTransferTestApp(repository))
      .post('/api/transfers')
      .set('Cookie', TEST_SESSION_COOKIE)
      .set('Idempotency-Key', 'idem-key-1')
      .send({ recipientId, amount: 1500 });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: 1,
      senderId: CURRENT_USER_ID,
      recipientId,
      amount: 1500,
    });
    expect(repository.transfers).toEqual([
      {
        senderId: CURRENT_USER_ID,
        recipientId,
        amount: 1500,
        idempotencyKey: 'idem-key-1',
      },
    ]);
  });

  // bodyでsenderIdを指定できると、他人になりすまして送金できてしまう。
  it('bodyのsenderIdを無視してセッションのユーザーで送金する', async () => {
    const repository = new InMemoryTransferRepository();
    const response = await request(createTransferTestApp(repository))
      .post('/api/transfers')
      .set('Cookie', TEST_SESSION_COOKIE)
      .set('Idempotency-Key', 'idem-key-2')
      .send({
        senderId: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf009',
        recipientId: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf002',
        amount: 1500,
      });

    expect(response.status).toBe(201);
    expect(repository.transfers[0]?.senderId).toBe(CURRENT_USER_ID);
  });

  it('セッション無しの送金を401にし、保存もしない', async () => {
    const repository = new InMemoryTransferRepository();
    const response = await request(createTransferTestApp(repository))
      .post('/api/transfers')
      .set('Idempotency-Key', 'idem-key-3')
      .send({
        recipientId: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf002',
        amount: 1500,
      });

    expect(response.status).toBe(401);
    expect(repository.transfers).toEqual([]);
  });

  const recipientId = '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf002';
  it.each([
    [{ amount: 1500 }, 'recipientId'],
    [{ recipientId: CURRENT_USER_ID, amount: 1500 }, 'different'],
    [{ recipientId, amount: 0 }, 'amount'],
    [{ recipientId, amount: 10.5 }, 'amount'],
  ])('不正な入力に400を返す: %j', async (body, expectedError) => {
    const repository = new InMemoryTransferRepository();
    const response = await request(createTransferTestApp(repository))
      .post('/api/transfers')
      .set('Cookie', TEST_SESSION_COOKIE)
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
      .set('Cookie', TEST_SESSION_COOKIE)
      .set('Idempotency-Key', 'idem-key-1')
      .send({
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
      .set('Cookie', TEST_SESSION_COOKIE)
      .send({ recipientId, amount: 1500 });

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
      .set('Cookie', TEST_SESSION_COOKIE)
      .set('Idempotency-Key', 'idem-key-1')
      .send({ recipientId, amount: 1500 });

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
      .set('Cookie', TEST_SESSION_COOKIE)
      .set('Idempotency-Key', 'idem-key-1')
      .send({ recipientId, amount: 1500 });

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
      .set('Cookie', TEST_SESSION_COOKIE)
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
      .set('Cookie', TEST_SESSION_COOKIE)
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
      .set('Cookie', TEST_SESSION_COOKIE)
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
      .set('Cookie', TEST_SESSION_COOKIE)
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

    const response = await request(app)
      .get('/api/payment-requests?direction=received')
      .set('Cookie', TEST_SESSION_COOKIE);
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
      endedByMe: null,
      createdAt: '2026-08-03 01:00:00.000000',
      respondedAt: '2026-08-04 02:30:00.500000',
    });
    const { app } = createTestApp({
      currentUser: createCurrentUser({ id: CURRENT_USER_ID }),
      paymentRequestRecords: [record],
    });

    const response = await request(app)
      .get('/api/payment-requests?direction=received')
      .set('Cookie', TEST_SESSION_COOKIE);

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
          endedByMe: null,
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

    const response = await request(app)
      .get('/api/payment-requests?direction=received')
      .set('Cookie', TEST_SESSION_COOKIE);
    const body = asPaymentRequestListBody(response.body);

    expect(body.requests).toHaveLength(20);
    expect(body.pageInfo).toEqual({ nextCursor: null, hasNextPage: false });
  });

  it('次ページのカーソルを検索条件として使う', async () => {
    const cursor = {
      createdAt: '2026-08-04 12:00:20.000000',
      id: '00000000-0000-4000-8000-000000000020',
    };
    const paymentRequestQueryRepository = createPaymentRequestQueryRepository();
    const { app } = createTestApp({
      currentUser: createCurrentUser({ id: CURRENT_USER_ID }),
      paymentRequestQueryRepository,
    });

    const response = await request(app)
      .get('/api/payment-requests')
      .set('Cookie', TEST_SESSION_COOKIE)
      .query({
        direction: 'sent',
        status: 'pending',
        cursor: encodePaymentRequestCursor(cursor),
      });

    expect(response.status).toBe(200);
    expect(
      paymentRequestQueryRepository.findPaymentRequests,
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

    const response = await request(app)
      .get(`/api/payment-requests${query}`)
      .set('Cookie', TEST_SESSION_COOKIE);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: 'INVALID_REQUEST', message },
    });
  });

  it('請求一覧で現在ユーザーが存在しなければ404にする', async () => {
    const { app } = createTestApp({ currentUser: null });

    const response = await request(app)
      .get('/api/payment-requests?direction=received')
      .set('Cookie', TEST_SESSION_COOKIE);

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

    const response = await request(app)
      .post(`/api/payment-requests/${PAYMENT_REQUEST_ID}/accept`)
      .set('Cookie', TEST_SESSION_COOKIE);

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
      action: 'accept',
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

    const response = await request(app)
      .post(`/api/payment-requests/${PAYMENT_REQUEST_ID}/reject`)
      .set('Cookie', TEST_SESSION_COOKIE);

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
      new PaymentRequestForbiddenError('recipient'),
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

    const response = await request(app)
      .post(`/api/payment-requests/${PAYMENT_REQUEST_ID}/accept`)
      .set('Cookie', TEST_SESSION_COOKIE);

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

    const response = await request(app)
      .post('/api/payment-requests/not-a-uuid/accept')
      .set('Cookie', TEST_SESSION_COOKIE);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: 'INVALID_REQUEST', message: 'id must be a UUID' },
    });
    expect(paymentRequestCommandRepository.respond).not.toHaveBeenCalled();
  });

  it('承認で現在ユーザーが存在しなければ404にする', async () => {
    const { app } = createTestApp({ currentUser: null });

    const response = await request(app)
      .post(`/api/payment-requests/${PAYMENT_REQUEST_ID}/accept`)
      .set('Cookie', TEST_SESSION_COOKIE);

    expect(response.status).toBe(404);
    expect(asErrorBody(response.body).error.code).toBe(
      'CURRENT_USER_NOT_FOUND',
    );
  });

  it('請求者が請求を取り消せる', async () => {
    const paymentRequestCommandRepository =
      createPaymentRequestCommandRepository({
        responded: createRespondedPaymentRequest({
          id: PAYMENT_REQUEST_ID,
          amount: 3000,
          status: 'rejected',
          respondedAt: '2026-08-06 02:00:00.000000',
          recipientBalance: null,
        }),
      });
    const { app } = createTestApp({
      currentUser: createCurrentUser({ id: CURRENT_USER_ID }),
      paymentRequestCommandRepository,
    });

    const response = await request(app)
      .post(`/api/payment-requests/${PAYMENT_REQUEST_ID}/cancel`)
      .set('Cookie', TEST_SESSION_COOKIE);
    const body = asPaymentRequestResponseBody(response.body);

    expect(response.status).toBe(200);
    // 取り消しでも残高は動かないため、balanceは返さない。
    expect(body.balance).toBeUndefined();
    expect(body.request.status).toBe('rejected');
    expect(paymentRequestCommandRepository.respond).toHaveBeenCalledWith({
      paymentRequestId: PAYMENT_REQUEST_ID,
      currentUserInternalId: CURRENT_USER_ID,
      action: 'cancel',
    });
  });

  it('被請求者でない取り消しを403にする', async () => {
    const { app } = createTestApp({
      currentUser: createCurrentUser({ id: CURRENT_USER_ID }),
      paymentRequestCommandRepository: createPaymentRequestCommandRepository({
        error: new PaymentRequestForbiddenError('requester'),
      }),
    });

    const response = await request(app)
      .post(`/api/payment-requests/${PAYMENT_REQUEST_ID}/cancel`)
      .set('Cookie', TEST_SESSION_COOKIE);

    expect(response.status).toBe(403);
    expect(asErrorBody(response.body).error).toEqual({
      code: 'PAYMENT_REQUEST_FORBIDDEN',
      message:
        'Only the requester can perform this action on the payment request.',
    });
  });

  it('請求1件を一覧と同じ形で返す', async () => {
    const record = createPaymentRequestRecord(1, {
      amount: 3000,
      status: 'pending',
      endedByMe: null,
      createdAt: '2026-08-03 01:00:00.000000',
      respondedAt: null,
    });
    const paymentRequestQueryRepository = createPaymentRequestQueryRepository({
      record,
    });
    const { app } = createTestApp({
      currentUser: createCurrentUser({ id: CURRENT_USER_ID }),
      paymentRequestQueryRepository,
    });

    const response = await request(app)
      .get(`/api/payment-requests/${PAYMENT_REQUEST_ID}`)
      .set('Cookie', TEST_SESSION_COOKIE);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      request: {
        id: record.id,
        counterparty: {
          id: record.counterpartyId,
          name: record.counterpartyName,
          profileUrl: record.counterpartyProfileUrl,
        },
        amount: 3000,
        status: 'pending',
        endedByMe: null,
        createdAt: '2026-08-03T01:00:00.000Z',
        respondedAt: null,
      },
    });
    expect(
      paymentRequestQueryRepository.findPaymentRequestById,
    ).toHaveBeenCalledWith({
      paymentRequestId: PAYMENT_REQUEST_ID,
      currentUserInternalId: CURRENT_USER_ID,
    });
  });

  // 当事者でない場合もrepositoryはnullを返す。存在の有無を区別しない。
  it('当事者でない請求は404にする', async () => {
    const { app } = createTestApp({
      currentUser: createCurrentUser({ id: CURRENT_USER_ID }),
      paymentRequestQueryRepository: createPaymentRequestQueryRepository({
        record: null,
      }),
    });

    const response = await request(app)
      .get(`/api/payment-requests/${PAYMENT_REQUEST_ID}`)
      .set('Cookie', TEST_SESSION_COOKIE);

    expect(response.status).toBe(404);
    expect(asErrorBody(response.body).error.code).toBe(
      'PAYMENT_REQUEST_NOT_FOUND',
    );
  });

  it('請求1件の取得でIDがUUIDでなければ400にする', async () => {
    const paymentRequestQueryRepository = createPaymentRequestQueryRepository();
    const { app } = createTestApp({
      currentUser: createCurrentUser({ id: CURRENT_USER_ID }),
      paymentRequestQueryRepository,
    });

    const response = await request(app)
      .get('/api/payment-requests/not-a-uuid')
      .set('Cookie', TEST_SESSION_COOKIE);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: 'INVALID_REQUEST', message: 'id must be a UUID' },
    });
    expect(
      paymentRequestQueryRepository.findPaymentRequestById,
    ).not.toHaveBeenCalled();
  });

  it('請求1件の取得で現在ユーザーが存在しなければ404にする', async () => {
    const { app } = createTestApp({ currentUser: null });

    const response = await request(app)
      .get(`/api/payment-requests/${PAYMENT_REQUEST_ID}`)
      .set('Cookie', TEST_SESSION_COOKIE);

    expect(response.status).toBe(404);
    expect(asErrorBody(response.body).error.code).toBe(
      'CURRENT_USER_NOT_FOUND',
    );
  });

  it('user_idとパスワードが合えばセッションCookieを返す', async () => {
    const { app } = createTestApp({
      authRepository: createAuthRepository({
        credential: { id: CURRENT_USER_ID, passwordHash: PASSWORD_HASH },
      }),
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ userId: MOCK_USER_ID, password: PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ authenticated: true });
    // tokenはCookieでのみ渡し、bodyへは載せない。
    const cookie = response.headers['set-cookie']?.[0] ?? '';
    expect(cookie).toContain('dabuchi_session=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
  });

  it('パスワードが違えば401にし、Cookieを発行しない', async () => {
    const { app } = createTestApp({
      authRepository: createAuthRepository({
        credential: { id: CURRENT_USER_ID, passwordHash: PASSWORD_HASH },
      }),
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ userId: MOCK_USER_ID, password: 'wrong password' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'The user id or password is incorrect.',
      },
    });
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('存在しないuser_idもパスワード違いと同じ応答にする', async () => {
    const { app } = createTestApp({
      authRepository: createAuthRepository({ credential: null }),
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ userId: 'unknown', password: PASSWORD });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'The user id or password is incorrect.',
      },
    });
  });

  it('新規登録すると201とセッションCookieを返す', async () => {
    const { app, authRepository } = createTestApp();

    const response = await request(app)
      .post('/api/auth/signup')
      .send({ userId: 'new-user', password: PASSWORD, name: '新井 太郎' });

    expect(response.status).toBe(201);
    expect(response.headers['set-cookie']?.[0]).toContain('dabuchi_session=');
    expect(authRepository.createUserWithSession).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'new-user', name: '新井 太郎' }),
      expect.anything(),
    );
  });

  it('使われている公開user_idでの登録を409にする', async () => {
    const { app } = createTestApp({
      authRepository: createAuthRepository({ userCreated: false }),
    });

    const response = await request(app)
      .post('/api/auth/signup')
      .send({ userId: 'friend-001', password: PASSWORD, name: '新井 太郎' });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      error: { code: 'USER_ID_ALREADY_TAKEN' },
    });
  });

  it('短すぎるパスワードでの登録を400にする', async () => {
    const { app } = createTestApp();

    const response = await request(app)
      .post('/api/auth/signup')
      .send({ userId: 'new-user', password: 'short', name: '新井 太郎' });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ error: { code: 'INVALID_REQUEST' } });
  });

  it('ログアウトでセッションを消し、Cookieも消す', async () => {
    const { app, authRepository } = createTestApp();

    const response = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', 'dabuchi_session=abc123');

    expect(response.status).toBe(204);
    expect(authRepository.deleteSession).toHaveBeenCalledWith(
      hashSessionToken('abc123'),
    );
    expect(response.headers['set-cookie']?.[0]).toContain('dabuchi_session=;');
  });

  it('Cookieが無くてもログアウトは成功する', async () => {
    const { app, authRepository } = createTestApp();

    const response = await request(app).post('/api/auth/logout');

    expect(response.status).toBe(204);
    expect(authRepository.deleteSession).not.toHaveBeenCalled();
  });

  // 認証が要るAPIを1つでも通してしまうと、他人になりすませる。
  // 新しいrouterを足したときの付け忘れを検出するため、全経路を並べて確認する。
  it.each([
    ['get', '/api/me'],
    ['get', '/api/transactions'],
    ['get', `/api/users/${CURRENT_USER_ID}/recipients`],
    ['get', '/api/friends'],
    ['get', '/api/friends/blocked'],
    ['get', `/api/friends/${FRIENDSHIP_ID}`],
    ['post', '/api/friends'],
    ['post', `/api/friends/${FRIENDSHIP_ID}/note`],
    ['put', `/api/friends/${FRIENDSHIP_ID}/note`],
    ['delete', `/api/friends/${FRIENDSHIP_ID}/note`],
    ['post', `/api/friends/${FRIENDSHIP_ID}/block`],
    ['delete', `/api/friends/${FRIENDSHIP_ID}/block`],
    ['post', '/api/transfers'],
    ['post', '/api/payment-requests'],
    ['get', '/api/payment-requests'],
    ['post', `/api/payment-requests/${PAYMENT_REQUEST_ID}/accept`],
    ['post', `/api/payment-requests/${PAYMENT_REQUEST_ID}/reject`],
    ['post', `/api/payment-requests/${PAYMENT_REQUEST_ID}/cancel`],
    ['get', `/api/payment-requests/${PAYMENT_REQUEST_ID}`],
  ] as const)('セッション無しの%s %sを401にする', async (method, path) => {
    const { app } = createTestApp();

    // methodを変数で選ぶため、一度受けてから呼ぶ（改行後の[]は構文が曖昧になる）。
    const agent = request(app);
    const response = await agent[method](path)
      .set('Idempotency-Key', 'idem-key-unauthenticated')
      .send({});

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      error: { code: 'NOT_AUTHENTICATED' },
    });
  });

  // 認証はしていても、他人のIDを指定して覗けてはいけない。
  it('他人のIDを指定した相手候補一覧を401にする', async () => {
    const { app } = createTestApp();

    const response = await request(app)
      .get('/api/users/5e5a4a1e-3b42-4f47-8b1f-b77ef98bf009/recipients')
      .set('Cookie', TEST_SESSION_COOKIE);

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      error: { code: 'NOT_AUTHENTICATED' },
    });
  });

  it('セッションが無効なら401にする', async () => {
    const { app } = createTestApp({
      // 期限切れやログアウト済みのtokenは、repositoryがnullを返す。
      authRepository: createAuthRepository({ sessionUser: null }),
    });

    const response = await request(app)
      .get('/api/me')
      .set('Cookie', TEST_SESSION_COOKIE);

    expect(response.status).toBe(401);
  });

  it('セッションのユーザーで現在ユーザーを解決する', async () => {
    const currentUser = createCurrentUser();
    const { app, currentUserRepository } = createTestApp({ currentUser });

    await request(app).get('/api/me').set('Cookie', TEST_SESSION_COOKIE);

    // clientはユーザーを指定できず、セッション由来の公開user_idで引く。
    expect(currentUserRepository.findByUserId).toHaveBeenCalledWith(
      MOCK_USER_ID,
    );
  });
});
