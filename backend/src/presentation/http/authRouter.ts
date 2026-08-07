import { Router } from 'express';

import { InvalidSignUpError } from '../../application/errors/authErrors.js';
import type { LogIn } from '../../application/usecases/logIn.js';
import type { LogOut } from '../../application/usecases/logOut.js';
import type { SignUp } from '../../application/usecases/signUp.js';
import {
  clearSessionCookie,
  readSessionToken,
  setSessionCookie,
} from './sessionCookie.js';

export interface AuthRouterDependencies {
  logIn: LogIn;
  logOut: LogOut;
  signUp: SignUp;
}

export function createAuthRouter(dependencies: AuthRouterDependencies): Router {
  const router = Router();

  router.post('/signup', (request, response, next) => {
    void (async () => {
      const { userId, password, name } = readSignUpRequest(request.body);
      const session = await dependencies.signUp.execute({
        userId,
        password,
        name,
      });

      setSessionCookie(response, session.token, session.expiresAt);
      response.status(201).json({ authenticated: true });
    })().catch(next);
  });

  router.post('/login', (request, response, next) => {
    void (async () => {
      const { userId, password } = readLogInRequest(request.body);
      const session = await dependencies.logIn.execute({ userId, password });

      setSessionCookie(response, session.token, session.expiresAt);
      // 認証済みの情報はGET /api/meで取る。ここでは成否だけ返す。
      response.status(200).json({ authenticated: true });
    })().catch(next);
  });

  router.post('/logout', (request, response, next) => {
    void dependencies.logOut
      .execute(readSessionToken(request.headers.cookie))
      .then(() => {
        clearSessionCookie(response);
        response.status(204).end();
      })
      .catch(next);
  });

  return router;
}

function readLogInRequest(body: unknown): { userId: string; password: string } {
  if (
    typeof body !== 'object' ||
    body === null ||
    !('userId' in body) ||
    !('password' in body) ||
    typeof body.userId !== 'string' ||
    typeof body.password !== 'string'
  ) {
    throw new InvalidSignUpError('userId and password must be strings.');
  }

  return { userId: body.userId, password: body.password };
}

function readSignUpRequest(body: unknown): {
  userId: string;
  password: string;
  name: string;
} {
  const { userId, password } = readLogInRequest(body);

  if (
    typeof body !== 'object' ||
    body === null ||
    !('name' in body) ||
    typeof body.name !== 'string'
  ) {
    throw new InvalidSignUpError('name must be a string.');
  }

  return { userId, password, name: body.name };
}
