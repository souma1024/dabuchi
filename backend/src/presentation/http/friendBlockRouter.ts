import { Router } from 'express';

import type { BlockFriend } from '../../application/usecases/blockFriend.js';
import type { UnblockFriend } from '../../application/usecases/unblockFriend.js';
import { requireCurrentUser } from './authentication.js';

export interface FriendBlockRouterDependencies {
  blockFriend: BlockFriend;
  unblockFriend: UnblockFriend;
}

export function createFriendBlockRouter(
  dependencies: FriendBlockRouterDependencies,
): Router {
  const router = Router();

  router.post('/:friendshipId/block', (request, response, next) => {
    void (async () => {
      const result = await dependencies.blockFriend.execute({
        currentUserPublicId: requireCurrentUser(response).userId,
        friendshipId: request.params.friendshipId ?? '',
      });

      response.status(200).json(result);
    })().catch(next);
  });

  router.delete('/:friendshipId/block', (request, response, next) => {
    void dependencies.unblockFriend
      .execute({
        currentUserPublicId: requireCurrentUser(response).userId,
        friendshipId: request.params.friendshipId ?? '',
      })
      .then(() => response.status(204).end())
      .catch(next);
  });

  return router;
}
