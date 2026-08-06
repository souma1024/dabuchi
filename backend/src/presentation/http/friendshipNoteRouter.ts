import { Router } from 'express';

import type { CreateFriendshipNote } from '../../application/usecases/createFriendshipNote.js';
import type { DeleteFriendshipNote } from '../../application/usecases/deleteFriendshipNote.js';
import type { UpdateFriendshipNote } from '../../application/usecases/updateFriendshipNote.js';
import { InvalidFriendshipNoteError } from '../../domain/friendshipNote.js';

export interface FriendshipNoteRouterDependencies {
  createFriendshipNote: CreateFriendshipNote;
  currentUserPublicId: string;
  deleteFriendshipNote: DeleteFriendshipNote;
  updateFriendshipNote: UpdateFriendshipNote;
}

export function createFriendshipNoteRouter(
  dependencies: FriendshipNoteRouterDependencies,
): Router {
  const router = Router();

  router.post('/:friendshipId/note', (request, response, next) => {
    void (async () => {
      const note = await dependencies.createFriendshipNote.execute({
        currentUserPublicId: dependencies.currentUserPublicId,
        friendshipId: request.params.friendshipId ?? '',
        message: readMessage(request.body),
      });

      response.status(201).json({ note });
    })().catch(next);
  });

  router.put('/:friendshipId/note', (request, response, next) => {
    void (async () => {
      const note = await dependencies.updateFriendshipNote.execute({
        currentUserPublicId: dependencies.currentUserPublicId,
        friendshipId: request.params.friendshipId ?? '',
        message: readMessage(request.body),
      });

      response.status(200).json({ note });
    })().catch(next);
  });

  router.delete('/:friendshipId/note', (request, response, next) => {
    void dependencies.deleteFriendshipNote
      .execute({
        currentUserPublicId: dependencies.currentUserPublicId,
        friendshipId: request.params.friendshipId ?? '',
      })
      .then(() => response.status(204).end())
      .catch(next);
  });

  return router;
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
