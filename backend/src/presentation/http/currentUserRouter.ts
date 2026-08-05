import { Router } from 'express';

import type { GetCurrentUser } from '../../application/usecases/getCurrentUser.js';

export function createCurrentUserRouter(
  getCurrentUser: GetCurrentUser,
  currentUserId: string,
): Router {
  const router = Router();

  router.get('/', (_request, response, next) => {
    void getCurrentUser
      .execute(currentUserId)
      .then((user) => response.status(200).json({ user }))
      .catch(next);
  });

  return router;
}
