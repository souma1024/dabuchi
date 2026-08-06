import { describe, expect, it, vi } from 'vitest';

import { verifyPassword } from '../../domain/password.js';
import { hashSessionToken } from '../../domain/session.js';
import { createAuthRepository } from '../../test/factories/authRepositoryFactory.js';
import {
  InvalidSignUpError,
  UserIdAlreadyTakenError,
} from '../errors/authErrors.js';
import { SignUp } from './signUp.js';

const GENERATED_ID = '20000000-0000-4000-8000-000000000001';
const NOW = new Date('2026-08-06T00:00:00.000Z');
const VALID_INPUT = {
  userId: 'new-user',
  password: 'correct horse battery',
  name: '新井 太郎',
};

function createUseCase(options: { userCreated?: boolean } = {}) {
  const authRepository = createAuthRepository(options);

  return {
    authRepository,
    useCase: new SignUp(
      authRepository,
      () => GENERATED_ID,
      () => NOW,
    ),
  };
}

describe('SignUp', () => {
  it('ユーザーを作り、そのままログイン状態にする', async () => {
    const { authRepository, useCase } = createUseCase();

    const session = await useCase.execute(VALID_INPUT);

    expect(session.userId).toBe(GENERATED_ID);
    expect(authRepository.createSession).toHaveBeenCalledWith({
      tokenHash: hashSessionToken(session.token),
      userId: GENERATED_ID,
      expiresAt: new Date('2026-08-13T00:00:00.000Z'),
    });
  });

  it('パスワードは平文で渡さず、ハッシュにして保存する', async () => {
    const { authRepository, useCase } = createUseCase();

    await useCase.execute(VALID_INPUT);

    const saved = vi.mocked(authRepository.createUser).mock.calls[0]?.[0];
    if (!saved) {
      throw new Error('createUser was not called.');
    }
    expect(saved.passwordHash).not.toContain(VALID_INPUT.password);
    await expect(
      verifyPassword(VALID_INPUT.password, saved.passwordHash),
    ).resolves.toBe(true);
  });

  it('前後の空白を落として保存する', async () => {
    const { authRepository, useCase } = createUseCase();

    await useCase.execute({
      ...VALID_INPUT,
      userId: '  new-user  ',
      name: '  新井 太郎  ',
    });

    expect(authRepository.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'new-user', name: '新井 太郎' }),
    );
  });

  it('公開user_idが既に使われていれば409相当のエラーにする', async () => {
    const { authRepository, useCase } = createUseCase({ userCreated: false });

    await expect(useCase.execute(VALID_INPUT)).rejects.toThrow(
      UserIdAlreadyTakenError,
    );
    expect(authRepository.createSession).not.toHaveBeenCalled();
  });

  it.each([
    ['user_idが空', { userId: '   ' }],
    ['user_idが長すぎる', { userId: 'a'.repeat(65) }],
    ['user_idに使えない記号', { userId: 'new user' }],
    ['user_idが記号で始まる', { userId: '-new-user' }],
    ['氏名が空', { name: '  ' }],
    ['氏名が長すぎる', { name: 'あ'.repeat(101) }],
  ])('不正な入力を拒否する: %s', async (_case, overrides) => {
    const { authRepository, useCase } = createUseCase();

    await expect(
      useCase.execute({ ...VALID_INPUT, ...overrides }),
    ).rejects.toThrow(InvalidSignUpError);
    expect(authRepository.createUser).not.toHaveBeenCalled();
  });
});
