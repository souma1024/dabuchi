import express, { type ErrorRequestHandler } from 'express';
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
import { decodeFriendCursor } from './friendCursorCodec.js';
import {
  createFriendQueryRouter,
  InvalidFriendRequestError,
} from './friendQueryRouter.js';

const CURRENT_USER_PUBLIC_ID = '001';
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
        addedAt: detail.addedAt,
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
});

function createTestApp(
  options: {
    friends?: ReturnType<typeof createFriendQueryRecords>;
    blockedFriends?: ReturnType<typeof createBlockedFriendQueryRecords>;
    detail?: ReturnType<typeof createFriendshipDetailQueryRecord>;
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
    '/api/friends',
    createFriendQueryRouter({
      currentUserPublicId: CURRENT_USER_PUBLIC_ID,
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
  app.use(testErrorHandler);

  return { app, friendQueryRepository };
}

const testErrorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  _next,
) => {
  void _next;

  if (error instanceof InvalidFriendRequestError) {
    response.status(400).json({
      error: { code: 'INVALID_REQUEST', message: error.message },
    });
    return;
  }

  response.status(500).json({
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'Unexpected error.' },
  });
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
