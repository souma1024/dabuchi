import { Router } from 'express';

import type { GetCurrentUser } from '../../application/usecases/getCurrentUser.js';
import { requireCurrentUser } from './authentication.js';

export function createCurrentUserRouter(
  getCurrentUser: GetCurrentUser,
): Router {
  const router = Router();

  router.get('/', (_request, response, next) => {
    void (async () => {
      // 現在ユーザーはセッションから決まる。clientからは指定できない。
      const { userId } = requireCurrentUser(response);
      const user = await getCurrentUser.execute(userId);

      response.status(200).json({ user });
    })().catch(next);
  });

  return router;
}
