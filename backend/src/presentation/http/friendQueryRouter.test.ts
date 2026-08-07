import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { GetFriendshipDetail } from '../../application/usecases/getFriendshipDetail.js';
import { ListBlockedFriends } from '../../application/usecases/listBlockedFriends.js';
import { ListFriends } from '../../application/usecases/listFriends.js';
import { createCurrentUserRepository } from '../../test/factories/currentUserRepositoryFactory.js';
import {
  createBlockedFriendQueryRecords,
  createFriendQueryRecord,
  createFriendQueryRecords,
  createFriendshipDetailQueryRecord,
} from '../../test/factories/friendQueryFactory.js';
import { createFriendQueryRepository } from '../../test/factories/friendQueryRepositoryFactory.js';
import { errorHandler } from './errorHandler.js';
import { decodeFriendCursor } from './friendCursorCodec.js';
import { createFriendQueryRouter } from './friendQueryRouter.js';
import { withCurrentUser } from '../../test/withCurrentUser.js';

const CURRENT_USER_PUBLIC_ID = '001';
const CURRENT_USER_INTERNAL_ID = '11111111-1111-4111-8111-111111111111';
const FRIENDSHIP_ID = '10000000-0000-4000-8000-000000000001';

describe('friend query router', () => {
  it('友達20件と次ページcursorを返す', async () => {
    const records = createFriendQueryRecords(21);
    const { app } = createTestApp({ friends: records });

    const response = await request(app).get('/api/friends');
    const body: unknown = response.body;

    expect(response.status).toBe(200);
    if (
      !isRecord(body) ||
      !Array.isArray(body.friends) ||
      !isRecord(body.pageInfo)
    ) {
      throw new Error('Friend list response shape is invalid.');
    }
    const nextCursor = body.pageInfo.nextCursor;
    if (typeof nextCursor !== 'string') {
      throw new Error('nextCursor must be a string.');
    }
    expect(body.friends).toHaveLength(20);
    expect(body.pageInfo.hasNextPage).toBe(true);
    expect(decodeFriendCursor(nextCursor)).toEqual({
      createdAt: records[19]?.addedAt,
      id: records[19]?.friendshipId,
    });
  });

  it('ブロックした友達だけを返す', async () => {
    const records = createBlockedFriendQueryRecords(1);
    const { app } = createTestApp({ blockedFriends: records });

    const response = await request(app).get('/api/friends/blocked');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      friends: [{ friendshipId: records[0]?.friendshipId }],
      pageInfo: { nextCursor: null, hasNextPage: false },
    });
  });

  it('友達詳細を返す', async () => {
    const detail = createFriendshipDetailQueryRecord(1, {
      friendshipId: FRIENDSHIP_ID,
      note: '大学の友人',
    });
    const { app } = createTestApp({ detail });

    const response = await request(app).get(`/api/friends/${FRIENDSHIP_ID}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      friend: {
        friendshipId: detail.friendshipId,
        friend: detail.friend,
        addedBy: detail.addedBy,
        addedAt: '2026-08-06T10:00:01.000Z',
        note: detail.note,
      },
    });
  });

  it.each(['/api/friends?cursor=invalid', '/api/friends/not-a-uuid'])(
    '不正な外部入力を400にする: %s',
    async (path) => {
      const { app } = createTestApp();

      const response = await request(app).get(path);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: { code: 'INVALID_REQUEST' },
      });
    },
  );

  it('存在しない友達関係の詳細を404にする', async () => {
    const { app } = createTestApp({ detail: null });

    const response = await request(app).get(`/api/friends/${FRIENDSHIP_ID}`);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      error: { code: 'FRIENDSHIP_NOT_FOUND' },
    });
  });

  it('相手からブロックされている友達関係の詳細を404にする', async () => {
    const detail = createFriendshipDetailQueryRecord(1, {
      friendshipId: FRIENDSHIP_ID,
      blocksCurrentUser: true,
      blockedByCurrentUser: false,
    });
    const { app } = createTestApp({ detail });

    const response = await request(app).get(`/api/friends/${FRIENDSHIP_ID}`);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      error: { code: 'FRIENDSHIP_NOT_FOUND' },
    });
  });

  it('自分がブロックした友達関係の詳細は返す', async () => {
    const detail = createFriendshipDetailQueryRecord(1, {
      friendshipId: FRIENDSHIP_ID,
      blockedByCurrentUser: true,
      blocksCurrentUser: true,
    });
    const { app } = createTestApp({ detail });

    const response = await request(app).get(`/api/friends/${FRIENDSHIP_ID}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      friend: { friendshipId: FRIENDSHIP_ID },
    });
  });
});

function createTestApp(
  options: {
    friends?: ReturnType<typeof createFriendQueryRecords>;
    blockedFriends?: ReturnType<typeof createBlockedFriendQueryRecords>;
    detail?: ReturnType<typeof createFriendshipDetailQueryRecord> | null;
  } = {},
) {
  const friendQueryRepository = createFriendQueryRepository({
    friends: options.friends ?? [createFriendQueryRecord()],
    blockedFriends: options.blockedFriends ?? [],
    detail: options.detail,
  });
  const currentUserRepository = createCurrentUserRepository();
  const app = express();
  app.use(
    withCurrentUser({
      id: CURRENT_USER_INTERNAL_ID,
      userId: CURRENT_USER_PUBLIC_ID,
    }),
  );

  app.use(
    '/api/friends',
    createFriendQueryRouter({
      listFriends: new ListFriends(
        currentUserRepository,
        friendQueryRepository,
      ),
      listBlockedFriends: new ListBlockedFriends(
        currentUserRepository,
        friendQueryRepository,
      ),
      getFriendshipDetail: new GetFriendshipDetail(
        currentUserRepository,
        friendQueryRepository,
      ),
    }),
  );
  // 本番と同じerrorHandlerを使い、statusとcodeの対応をテストでも保証する。
  app.use(errorHandler);

  return { app, friendQueryRepository };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
