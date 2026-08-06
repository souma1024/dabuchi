import { vi } from 'vitest';

import type {
  AuthRepository,
  AuthenticatedUser,
  UserCredential,
} from '../../application/ports/authRepository.js';

interface AuthRepositoryFactoryOptions {
  credential?: UserCredential | null;
  /** createUserの結果。falseなら公開user_idが既に使われている。 */
  userCreated?: boolean;
  sessionUser?: AuthenticatedUser | null;
}

export function createAuthRepository(
  options: AuthRepositoryFactoryOptions = {},
): AuthRepository {
  return {
    findCredentialByUserId: vi
      .fn<AuthRepository['findCredentialByUserId']>()
      .mockResolvedValue(
        options.credential === undefined ? null : options.credential,
      ),
    createUser: vi
      .fn<AuthRepository['createUser']>()
      .mockResolvedValue(options.userCreated ?? true),
    createSession: vi
      .fn<AuthRepository['createSession']>()
      .mockResolvedValue(undefined),
    findUserBySessionToken: vi
      .fn<AuthRepository['findUserBySessionToken']>()
      .mockResolvedValue(
        options.sessionUser === undefined ? null : options.sessionUser,
      ),
    deleteSession: vi
      .fn<AuthRepository['deleteSession']>()
      .mockResolvedValue(undefined),
  };
}
