import express, { type ErrorRequestHandler } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { InvalidFriendshipIdError } from '../../application/errors/friendCommandErrors.js';
import { BlockFriend } from '../../application/usecases/blockFriend.js';
import { UnblockFriend } from '../../application/usecases/unblockFriend.js';
import { createCurrentUserRepository } from '../../test/factories/currentUserRepositoryFactory.js';
import { createFriendCommandRepository } from '../../test/factories/friendCommandRepositoryFactory.js';
import { createFriendBlockRouter } from './friendBlockRouter.js';
import { withCurrentUser } from '../../test/withCurrentUser.js';

const CURRENT_USER_PUBLIC_ID = '001';
const CURRENT_USER_INTERNAL_ID = '11111111-1111-4111-8111-111111111111';
const FRIENDSHIP_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('friend block router', () => {
  it('友達を冪等にブロックして200を返す', async () => {
    const { app, repository } = createTestApp();

    const response = await request(app).post(
      `/api/friends/${FRIENDSHIP_ID}/block`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      friendshipId: FRIENDSHIP_ID,
      blocked: true,
    });
    expect(repository.blockUser).toHaveBeenCalledWith({
      blockerId: '11111111-1111-4111-8111-111111111111',
      blockedUserId: '22222222-2222-4222-8222-222222222222',
    });
  });

  it('友達のブロックを冪等に解除して204を返す', async () => {
    const { app, repository } = createTestApp();

    const response = await request(app).delete(
      `/api/friends/${FRIENDSHIP_ID}/block`,
    );

    expect(response.status).toBe(204);
    expect(repository.unblockUser).toHaveBeenCalledOnce();
  });

  it.each(['post', 'delete'] as const)(
    '不正なfriendship UUIDの%sを400にする',
    async (method) => {
      const { app } = createTestApp();

      const response = await request(app)[method]('/api/friends/invalid/block');

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: { code: 'INVALID_REQUEST' },
      });
    },
  );
});

function createTestApp() {
  const currentUserRepository = createCurrentUserRepository();
  const repository = createFriendCommandRepository({
    friendship: {
      friendshipId: FRIENDSHIP_ID,
      friendId: '22222222-2222-4222-8222-222222222222',
      note: '大学の友人',
      blockedByCurrentUser: false,
      blocksCurrentUser: false,
    },
  });
  const app = express();
  app.use(
    withCurrentUser({
      id: CURRENT_USER_INTERNAL_ID,
      userId: CURRENT_USER_PUBLIC_ID,
    }),
  );

  app.use(
    '/api/friends',
    createFriendBlockRouter({
      blockFriend: new BlockFriend(currentUserRepository, repository),
      unblockFriend: new UnblockFriend(currentUserRepository, repository),
    }),
  );
  app.use(testErrorHandler);

  return { app, repository };
}

const testErrorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  next,
) => {
  void next;

  if (error instanceof InvalidFriendshipIdError) {
    response.status(400).json({
      error: { code: 'INVALID_REQUEST', message: error.message },
    });
    return;
  }

  response.status(500).json({
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'Unexpected error.' },
  });
};
