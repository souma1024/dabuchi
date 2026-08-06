import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import {
  FriendUserNotFoundError,
  FriendshipAlreadyExistsError,
  FriendshipNoteAlreadyExistsError,
  FriendshipNoteNotFoundError,
  InvalidFriendshipIdError,
  InvalidFriendUserIdError,
} from '../../application/errors/friendCommandErrors.js';
import { FriendshipNotFoundError } from '../../application/errors/friendshipNotFoundError.js';
import { InvalidFriendshipError } from '../../domain/friendship.js';
import { InvalidFriendshipNoteError } from '../../domain/friendshipNote.js';
import { InvalidUserBlockError } from '../../domain/userBlock.js';
import { errorHandler } from './errorHandler.js';

describe('friend command error mapping', () => {
  it.each([
    new InvalidFriendUserIdError('invalid user ID'),
    new InvalidFriendshipIdError(),
    new InvalidFriendshipError('invalid friendship'),
    new InvalidFriendshipNoteError('invalid note'),
    new InvalidUserBlockError('invalid block'),
  ])('%sを共通形式の400へ変換する', async (error) => {
    const response = await request(createErrorApp(error)).get('/error');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: { code: 'INVALID_REQUEST', message: error.message },
    });
  });

  it.each([
    {
      error: new FriendUserNotFoundError(),
      code: 'FRIEND_USER_NOT_FOUND',
    },
    {
      error: new FriendshipNotFoundError(),
      code: 'FRIENDSHIP_NOT_FOUND',
    },
    {
      error: new FriendshipNoteNotFoundError(),
      code: 'FRIENDSHIP_NOTE_NOT_FOUND',
    },
  ])('$codeを共通形式の404へ変換する', async ({ error, code }) => {
    const response = await request(createErrorApp(error)).get('/error');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      error: { code, message: error.message },
    });
  });

  it.each([
    {
      error: new FriendshipAlreadyExistsError(),
      code: 'FRIENDSHIP_ALREADY_EXISTS',
    },
    {
      error: new FriendshipNoteAlreadyExistsError(),
      code: 'FRIENDSHIP_NOTE_ALREADY_EXISTS',
    },
  ])('$codeを共通形式の409へ変換する', async ({ error, code }) => {
    const response = await request(createErrorApp(error)).get('/error');

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      error: { code, message: error.message },
    });
  });
});

function createErrorApp(error: Error) {
  const app = express();

  app.get('/error', () => {
    throw error;
  });
  app.use(errorHandler);

  return app;
}
