import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createTestApp } from '../../test/factories/appFactory.js';
import { encodeTransactionCursor } from './transactionCursorCodec.js';

const CURRENT_USER_ID = '11111111-1111-4111-8111-111111111111';

describe('user transaction router', () => {
  it('sort=created-ascを検索条件として使う', async () => {
    const { app, transactionRepository } = createTestApp();

    const response = await request(app)
      .get(`/api/users/${CURRENT_USER_ID}/transactions`)
      .query({ sort: 'created-asc' });

    expect(response.status).toBe(200);
    expect(transactionRepository.findTransactions).toHaveBeenCalledWith({
      currentUserId: CURRENT_USER_ID,
      cursor: null,
      limit: 21,
      sort: 'created-asc',
    });
  });

  it('不正なsortを400にする', async () => {
    const { app } = createTestApp();

    const response = await request(app)
      .get(`/api/users/${CURRENT_USER_ID}/transactions`)
      .query({ sort: 'unknown' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'INVALID_REQUEST',
        message: 'sort must be one of created-desc or created-asc.',
      },
    });
  });

  it('sortと一致しないカーソルを400にする', async () => {
    const { app } = createTestApp();
    const cursor = {
      sort: 'created-desc' as const,
      value: {
        createdAt: '2026-08-04 12:00:20.000000',
        id: '20',
      },
    };

    const response = await request(app)
      .get(`/api/users/${CURRENT_USER_ID}/transactions`)
      .query({ sort: 'created-asc', cursor: encodeTransactionCursor(cursor) });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: 'INVALID_REQUEST', message: 'cursor is invalid.' },
    });
  });
});
