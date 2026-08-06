import express, { type ErrorRequestHandler } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { InvalidFriendshipIdError } from '../../application/errors/friendCommandErrors.js';
import { CreateFriendshipNote } from '../../application/usecases/createFriendshipNote.js';
import { DeleteFriendshipNote } from '../../application/usecases/deleteFriendshipNote.js';
import { UpdateFriendshipNote } from '../../application/usecases/updateFriendshipNote.js';
import { InvalidFriendshipNoteError } from '../../domain/friendshipNote.js';
import { createCurrentUserRepository } from '../../test/factories/currentUserRepositoryFactory.js';
import { createFriendCommandRepository } from '../../test/factories/friendCommandRepositoryFactory.js';
import { createFriendshipNoteRouter } from './friendshipNoteRouter.js';

const CURRENT_USER_PUBLIC_ID = '001';
const FRIENDSHIP_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('friendship note router', () => {
  it('自分用メモを作成して201を返す', async () => {
    const { app, repository } = createTestApp(null);

    const response = await request(app)
      .post(`/api/friends/${FRIENDSHIP_ID}/note`)
      .send({ message: '大学の友人' });

    expect(response.status).toBe(201);
    // 日時はISO 8601。内部userIdは含めない。
    expect(response.body).toEqual({
      note: {
        friendshipId: FRIENDSHIP_ID,
        message: '大学の友人',
        createdAt: '2026-08-06T12:10:00.000Z',
        updatedAt: '2026-08-06T12:10:00.000Z',
      },
    });
    expect(repository.createNote).toHaveBeenCalledWith(
      expect.objectContaining({
        friendshipId: FRIENDSHIP_ID,
        message: '大学の友人',
      }),
    );
  });

  it('既存の自分用メモを更新して200を返す', async () => {
    const { app, repository } = createTestApp('大学の友人');

    const response = await request(app)
      .put(`/api/friends/${FRIENDSHIP_ID}/note`)
      .send({ message: 'ゼミの友人' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      note: {
        friendshipId: FRIENDSHIP_ID,
        message: 'ゼミの友人',
        createdAt: '2026-08-06T12:10:00.000Z',
        updatedAt: '2026-08-06T12:20:00.000Z',
      },
    });
    expect(repository.updateNote).toHaveBeenCalledOnce();
  });

  it('空文字更新ではメモ行を削除してnullを返す', async () => {
    const { app, repository } = createTestApp('大学の友人');

    const response = await request(app)
      .put(`/api/friends/${FRIENDSHIP_ID}/note`)
      .send({ message: '   ' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ note: null });
    expect(repository.deleteNote).toHaveBeenCalledOnce();
  });

  it('メモを冪等に削除して204を返す', async () => {
    const { app, repository } = createTestApp(null);

    const response = await request(app).delete(
      `/api/friends/${FRIENDSHIP_ID}/note`,
    );

    expect(response.status).toBe(204);
    expect(repository.deleteNote).toHaveBeenCalledOnce();
  });

  it.each([
    { path: `/api/friends/${FRIENDSHIP_ID}/note`, body: {} },
    { path: '/api/friends/not-a-uuid/note', body: { message: 'メモ' } },
  ])('不正な入力を400にする: $path', async ({ path, body }) => {
    const { app } = createTestApp(null);

    const response = await request(app).post(path).send(body);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ error: { code: 'INVALID_REQUEST' } });
  });
});

function createTestApp(note: string | null) {
  const currentUserRepository = createCurrentUserRepository();
  const repository = createFriendCommandRepository({
    friendship: {
      friendshipId: FRIENDSHIP_ID,
      friendId: '22222222-2222-4222-8222-222222222222',
      note,
      blockedByCurrentUser: false,
      blocksCurrentUser: false,
    },
  });
  const app = express();

  app.use(express.json());
  app.use(
    '/api/friends',
    createFriendshipNoteRouter({
      currentUserPublicId: CURRENT_USER_PUBLIC_ID,
      createFriendshipNote: new CreateFriendshipNote(
        currentUserRepository,
        repository,
      ),
      updateFriendshipNote: new UpdateFriendshipNote(
        currentUserRepository,
        repository,
      ),
      deleteFriendshipNote: new DeleteFriendshipNote(
        currentUserRepository,
        repository,
      ),
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

  if (
    error instanceof InvalidFriendshipNoteError ||
    error instanceof InvalidFriendshipIdError
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
