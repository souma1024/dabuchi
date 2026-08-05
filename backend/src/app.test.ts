import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from './app.js';
import {
  ListUserRecipients,
} from './application/usecases/listUserRecipients.js';
import { TransferParticipantNotFoundError } from './application/createTransfer.js';
import type {
  NewTransfer,
  TransferRepository,
} from './domain/transferRepository.js';
import { encodeRecipientCursor } from './presentation/http/recipientCursorCodec.js';
import { createTestApp } from './test/factories/appFactory.js';
import {
  createUserRecipientRecord,
  createUserRecipientRecords,
} from './test/factories/userRecipientFactory.js';
import { createUserRecipientRepository } from './test/factories/userRecipientRepositoryFactory.js';

const CURRENT_USER_ID = '11111111-1111-4111-8111-111111111111';

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
  const userRecipientRepository = createUserRecipientRepository();
  const listUserRecipients = new ListUserRecipients(userRecipientRepository);

  return createApp({ listUserRecipients, transferRepository: repository });
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
});
