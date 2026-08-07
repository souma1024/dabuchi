import { Router } from 'express';

import type { CreateFriendshipNote } from '../../application/usecases/createFriendshipNote.js';
import type { DeleteFriendshipNote } from '../../application/usecases/deleteFriendshipNote.js';
import type { UpdateFriendshipNote } from '../../application/usecases/updateFriendshipNote.js';
import {
  InvalidFriendshipNoteError,
  type FriendshipNote,
} from '../../domain/friendshipNote.js';
import { mysqlDateTimeToIso } from '../../shared/mysqlDateTime.js';
import { requireCurrentUser } from './authentication.js';

export interface FriendshipNoteRouterDependencies {
  createFriendshipNote: CreateFriendshipNote;
  deleteFriendshipNote: DeleteFriendshipNote;
  updateFriendshipNote: UpdateFriendshipNote;
}

export function createFriendshipNoteRouter(
  dependencies: FriendshipNoteRouterDependencies,
): Router {
  const router = Router();

  router.post('/:friendshipId/note', (request, response, next) => {
    void (async () => {
      // 認証を先に確かめる。未ログインの相手へ入力仕様を返さない。
      const { userId } = requireCurrentUser(response);
      const note = await dependencies.createFriendshipNote.execute({
        currentUserPublicId: userId,
        friendshipId: request.params.friendshipId ?? '',
        message: readMessage(request.body),
      });

      response.status(201).json({ note: toNoteResponse(note) });
    })().catch(next);
  });

  router.put('/:friendshipId/note', (request, response, next) => {
    void (async () => {
      const { userId } = requireCurrentUser(response);
      const note = await dependencies.updateFriendshipNote.execute({
        currentUserPublicId: userId,
        friendshipId: request.params.friendshipId ?? '',
        message: readMessage(request.body),
      });

      response.status(200).json({ note: note ? toNoteResponse(note) : null });
    })().catch(next);
  });

  router.delete('/:friendshipId/note', (request, response, next) => {
    void dependencies.deleteFriendshipNote
      .execute({
        currentUserPublicId: requireCurrentUser(response).userId,
        friendshipId: request.params.friendshipId ?? '',
      })
      .then(() => response.status(204).end())
      .catch(next);
  });

  return router;
}

interface FriendshipNoteResponse {
  friendshipId: string;
  message: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 自分用メモをAPIの表現へ変換する。
 * 日時はMySQLのDATETIME形式のままでは返さず、友達追加APIと同じISO 8601へ揃える。
 * 書き込んだ本人の内部userIdは、現在ユーザー自身であり公開する意味がないため含めない。
 */
function toNoteResponse(note: FriendshipNote): FriendshipNoteResponse {
  return {
    friendshipId: note.friendshipId,
    message: note.message,
    createdAt: mysqlDateTimeToIso(note.createdAt),
    updatedAt: mysqlDateTimeToIso(note.updatedAt),
  };
}

function readMessage(body: unknown): string {
  if (
    typeof body !== 'object' ||
    body === null ||
    !('message' in body) ||
    typeof body.message !== 'string'
  ) {
    throw new InvalidFriendshipNoteError('message must be a string.');
  }

  return body.message;
}
