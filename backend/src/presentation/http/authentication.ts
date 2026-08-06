import type { RequestHandler, Response } from 'express';

import { NotAuthenticatedError } from '../../application/errors/authErrors.js';
import type {
  AuthRepository,
  AuthenticatedUser,
} from '../../application/ports/authRepository.js';
import { hashSessionToken } from '../../domain/session.js';
import { readSessionToken } from './sessionCookie.js';

// response.localsは型なしのため、この鍵でだけ出し入れする。
const CURRENT_USER_KEY = 'currentUser';

/**
 * セッションCookieから現在ユーザーを解決してresponse.localsへ置く。
 *
 * ここでは未ログインを弾かない。認証が要るかはrouter側の都合なので、
 * 解決だけを行い、必要な場所でrequireCurrentUserを使う。
 */
export function createAuthentication(
  authRepository: AuthRepository,
): RequestHandler {
  return (request, response, next) => {
    const token = readSessionToken(request.headers.cookie);

    if (token === null) {
      next();
      return;
    }

    void authRepository
      .findUserBySessionToken(hashSessionToken(token))
      .then((user) => {
        if (user) {
          setCurrentUser(response, user);
        }
        next();
      })
      .catch(next);
  };
}

function setCurrentUser(response: Response, user: AuthenticatedUser): void {
  (response.locals as Record<string, unknown>)[CURRENT_USER_KEY] = user;
}

/** 解決済みの現在ユーザー。未ログインならnull。 */
export function findCurrentUser(response: Response): AuthenticatedUser | null {
  const user = (response.locals as Record<string, unknown>)[CURRENT_USER_KEY];

  return isAuthenticatedUser(user) ? user : null;
}

/** 現在ユーザーを取り出す。未ログインなら401にする。 */
export function requireCurrentUser(response: Response): AuthenticatedUser {
  const user = findCurrentUser(response);

  if (!user) {
    throw new NotAuthenticatedError();
  }

  return user;
}

function isAuthenticatedUser(value: unknown): value is AuthenticatedUser {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const user = value as Record<string, unknown>;

  return typeof user.id === 'string' && typeof user.userId === 'string';
}
