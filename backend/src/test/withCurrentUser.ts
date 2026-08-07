import type { RequestHandler } from 'express';

import type { AuthenticatedUser } from '../application/ports/authRepository.js';

/**
 * テスト用に、認証済みユーザーが解決された状態を作る。
 * 本番の解決はセッションCookie経由だが、routerのtestでは結果だけを置ければ足りる。
 */
export function withCurrentUser(
  user: AuthenticatedUser | null,
): RequestHandler {
  return (_request, response, next) => {
    if (user) {
      (response.locals as Record<string, unknown>).currentUser = user;
    }
    next();
  };
}
