import { describe, expect, it } from 'vitest';

import { createCurrentUser } from '../../test/factories/currentUserFactory.js';
import { createCurrentUserRepository } from '../../test/factories/currentUserRepositoryFactory.js';
import { CurrentUserNotFoundError } from '../errors/currentUserNotFoundError.js';
import { GetCurrentUser } from './getCurrentUser.js';

const MOCK_USER_ID = 'friend-001';

describe('GetCurrentUser', () => {
  it('公開ユーザーIDに対応するホーム表示用ユーザーを返す', async () => {
    const user = createCurrentUser();
    const repository = createCurrentUserRepository({ user });
    const useCase = new GetCurrentUser(repository);

    await expect(useCase.execute(MOCK_USER_ID)).resolves.toEqual(user);
    expect(repository.findByUserId).toHaveBeenCalledWith(MOCK_USER_ID);
  });

  it('設定されたユーザーが存在しなければエラーにする', async () => {
    const repository = createCurrentUserRepository({ user: null });
    const useCase = new GetCurrentUser(repository);

    await expect(useCase.execute(MOCK_USER_ID)).rejects.toBeInstanceOf(
      CurrentUserNotFoundError,
    );
  });
});
