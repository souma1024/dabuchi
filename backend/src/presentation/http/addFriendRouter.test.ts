import express, { type ErrorRequestHandler } from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { InvalidFriendUserIdError } from '../../application/errors/friendCommandErrors.js';
import { AddFriend } from '../../application/usecases/addFriend.js';
import { InvalidFriendshipNoteError } from '../../domain/friendshipNote.js';
import { createCurrentUserRepository } from '../../test/factories/currentUserRepositoryFactory.js';
import { createFriendCommandRepository } from '../../test/factories/friendCommandRepositoryFactory.js';
import { createAddFriendRouter } from './addFriendRouter.js';
import { withCurrentUser } from '../../test/withCurrentUser.js';

const CURRENT_USER_PUBLIC_ID = '001';
const CURRENT_USER_INTERNAL_ID = '11111111-1111-4111-8111-111111111111';
const FRIENDSHIP_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('add friend router', () => {
  it('公開user_idから友達を追加し201を返す', async () => {
    const { app, friendCommandRepository } = createTestApp();

    const response = await request(app)
      .post('/api/friends')
      .send({ friendUserId: 'friend-002', note: '大学の友人' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      friendship: {
        friendshipId: FRIENDSHIP_ID,
        friend: { userId: 'friend-002' },
        note: '大学の友人',
      },
    });
    expect(friendCommandRepository.findUserByPublicId).toHaveBeenCalledWith(
      'friend-002',
    );
    expect(friendCommandRepository.createFriendship).toHaveBeenCalledWith(
      expect.objectContaining({ initialNote: '大学の友人' }),
    );
  });

  it.each([{}, { friendUserId: 2 }])(
    'friendUserIdが文字列でなければ400にする: %j',
    async (body) => {
      const { app, friendCommandRepository } = createTestApp();

      const response = await request(app).post('/api/friends').send(body);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: { code: 'INVALID_REQUEST' },
      });
      expect(friendCommandRepository.findUserByPublicId).not.toHaveBeenCalled();
    },
  );

  it.each([{ note: 1 }, { note: false }, { note: {} }])(
    'noteが文字列またはnullでなければ400にする: %j',
    async ({ note }) => {
      const { app, friendCommandRepository } = createTestApp();

      const response = await request(app)
        .post('/api/friends')
        .send({ friendUserId: 'friend-002', note });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: { code: 'INVALID_REQUEST' },
      });
      expect(friendCommandRepository.findUserByPublicId).not.toHaveBeenCalled();
    },
  );
});

function createTestApp() {
  const currentUserRepository = createCurrentUserRepository();
  const friendCommandRepository = createFriendCommandRepository();
  const addFriend = new AddFriend(
    currentUserRepository,
    friendCommandRepository,
    vi.fn(() => FRIENDSHIP_ID),
  );
  const app = express();

  app.use(express.json());
  app.use(
    withCurrentUser({
      id: CURRENT_USER_INTERNAL_ID,
      userId: CURRENT_USER_PUBLIC_ID,
    }),
  );
  app.use('/api/friends', createAddFriendRouter(addFriend));
  app.use(testErrorHandler);

  return { app, friendCommandRepository };
}

const testErrorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  next,
) => {
  void next;

  if (
    error instanceof InvalidFriendUserIdError ||
    error instanceof InvalidFriendshipNoteError
  ) {
    response.status(400).json({
      error: { code: 'INVALID_REQUEST', message: error.message },
    });
    return;
  }

  response.status(500).json({
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'Unexpected error.' },
  });
};
