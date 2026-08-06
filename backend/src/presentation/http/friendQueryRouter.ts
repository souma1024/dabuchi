import { Router } from 'express';

import type { GetFriendshipDetail } from '../../application/usecases/getFriendshipDetail.js';
import type { ListBlockedFriends } from '../../application/usecases/listBlockedFriends.js';
import type { ListFriends } from '../../application/usecases/listFriends.js';
import {
  decodeBlockedFriendCursor,
  decodeFriendCursor,
  encodeBlockedFriendCursor,
  encodeFriendCursor,
} from './friendCursorCodec.js';
import { isUuid } from './recipientCursorCodec.js';

export class InvalidFriendRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidFriendRequestError';
  }
}

export interface FriendQueryRouterDependencies {
  currentUserPublicId: string;
  getFriendshipDetail: GetFriendshipDetail;
  listBlockedFriends: ListBlockedFriends;
  listFriends: ListFriends;
}

export function createFriendQueryRouter(
  dependencies: FriendQueryRouterDependencies,
): Router {
  const router = Router();

  router.get('/', (request, response, next) => {
    void (async () => {
      const cursor = parseCursor(request.query.cursor, decodeFriendCursor);
      const result = await dependencies.listFriends.execute({
        currentUserPublicId: dependencies.currentUserPublicId,
        cursor,
      });

      response.status(200).json({
        friends: result.friends,
        pageInfo: {
          nextCursor: result.nextCursor
            ? encodeFriendCursor(result.nextCursor)
            : null,
          hasNextPage: result.nextCursor !== null,
        },
      });
    })().catch(next);
  });

  router.get('/blocked', (request, response, next) => {
    void (async () => {
      const cursor = parseCursor(
        request.query.cursor,
        decodeBlockedFriendCursor,
      );
      const result = await dependencies.listBlockedFriends.execute({
        currentUserPublicId: dependencies.currentUserPublicId,
        cursor,
      });

      response.status(200).json({
        friends: result.friends,
        pageInfo: {
          nextCursor: result.nextCursor
            ? encodeBlockedFriendCursor(result.nextCursor)
            : null,
          hasNextPage: result.nextCursor !== null,
        },
      });
    })().catch(next);
  });

  router.get('/:friendshipId', (request, response, next) => {
    void (async () => {
      const { friendshipId } = request.params;

      if (!friendshipId || !isUuid(friendshipId)) {
        throw new InvalidFriendRequestError('friendshipId must be a UUID.');
      }

      const friend = await dependencies.getFriendshipDetail.execute({
        currentUserPublicId: dependencies.currentUserPublicId,
        friendshipId,
      });

      response.status(200).json({ friend });
    })().catch(next);
  });

  return router;
}

function parseCursor<Cursor>(
  value: unknown,
  decode: (cursor: string) => Cursor | null,
): Cursor | null {
  if (value === undefined) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new InvalidFriendRequestError('cursor must be a string.');
  }

  const cursor = decode(value);

  if (!cursor) {
    throw new InvalidFriendRequestError('cursor is invalid.');
  }

  return cursor;
}
