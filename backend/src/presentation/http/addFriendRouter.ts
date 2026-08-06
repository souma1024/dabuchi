import { Router } from 'express';

import { InvalidFriendUserIdError } from '../../application/errors/friendCommandErrors.js';
import type { AddFriend } from '../../application/usecases/addFriend.js';
import { InvalidFriendshipNoteError } from '../../domain/friendshipNote.js';
import { requireCurrentUser } from './authentication.js';

export function createAddFriendRouter(addFriend: AddFriend): Router {
  const router = Router();

  router.post('/', (request, response, next) => {
    void (async () => {
      // 認証を先に確かめる。未ログインの相手へ入力仕様を返さない。
      const { userId } = requireCurrentUser(response);
      const { friendUserId, note } = readAddFriendRequest(request.body);
      const friendship = await addFriend.execute({
        currentUserPublicId: userId,
        friendUserId,
        note,
      });

      response.status(201).json({ friendship });
    })().catch(next);
  });

  return router;
}

interface AddFriendRequest {
  friendUserId: string;
  note?: string | null;
}

function readAddFriendRequest(body: unknown): AddFriendRequest {
  if (
    typeof body !== 'object' ||
    body === null ||
    !('friendUserId' in body) ||
    typeof body.friendUserId !== 'string'
  ) {
    throw new InvalidFriendUserIdError('friendUserId must be a string.');
  }

  if (!('note' in body)) {
    return { friendUserId: body.friendUserId };
  }

  const note = body.note;

  if (note !== null && typeof note !== 'string') {
    throw new InvalidFriendshipNoteError('note must be a string or null.');
  }

  return {
    friendUserId: body.friendUserId,
    note,
  };
}
