import { describe, expect, it } from 'vitest';

import { hashSessionToken } from '../../domain/session.js';
import { hashPassword } from '../../domain/password.js';
import { createAuthRepository } from '../../test/factories/authRepositoryFactory.js';
import { InvalidCredentialsError } from '../errors/authErrors.js';
import { LogIn } from './logIn.js';
import { LogOut } from './logOut.js';

const USER_ID = 'friend-001';
const INTERNAL_ID = '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001';
const PASSWORD = 'correct horse battery';
const NOW = new Date('2026-08-06T00:00:00.000Z');

function createUseCase(passwordHash: string | null) {
  const authRepository = createAuthRepository({
    credential:
      passwordHash === null ? null : { id: INTERNAL_ID, passwordHash },
  });

  return { authRepository, useCase: new LogIn(authRepository, () => NOW) };
}

describe('LogIn', () => {
  it('パスワードが合えばセッションを作る', async () => {
    const { authRepository, useCase } = createUseCase(
      await hashPassword(PASSWORD),
    );

    const session = await useCase.execute({
      userId: USER_ID,
      password: PASSWORD,
    });

    expect(session.userId).toBe(INTERNAL_ID);
    // 有効期限は7日後。
    expect(session.expiresAt).toEqual(new Date('2026-08-13T00:00:00.000Z'));
    // 保存するのはtokenのハッシュだけ。DBが漏れてもtokenは復元できない。
    expect(authRepository.createSession).toHaveBeenCalledWith({
      tokenHash: hashSessionToken(session.token),
      userId: INTERNAL_ID,
      expiresAt: session.expiresAt,
    });
  });

  it('毎回違うtokenを発行する', async () => {
    const { useCase } = createUseCase(await hashPassword(PASSWORD));

    const first = await useCase.execute({
      userId: USER_ID,
      password: PASSWORD,
    });
    const second = await useCase.execute({
      userId: USER_ID,
      password: PASSWORD,
    });

    expect(first.token).not.toBe(second.token);
  });

  it('前後の空白を落としてuser_idを引く', async () => {
    const { authRepository, useCase } = createUseCase(
      await hashPassword(PASSWORD),
    );

    await useCase.execute({ userId: `  ${USER_ID}  `, password: PASSWORD });

    expect(authRepository.findCredentialByUserId).toHaveBeenCalledWith(USER_ID);
  });

  it('パスワードが違えば失敗させ、セッションを作らない', async () => {
    const { authRepository, useCase } = createUseCase(
      await hashPassword(PASSWORD),
    );

    await expect(
      useCase.execute({ userId: USER_ID, password: 'wrong password' }),
    ).rejects.toThrow(InvalidCredentialsError);
    expect(authRepository.createSession).not.toHaveBeenCalled();
  });

  // 存在するuser_idを総当たりで特定させないため、区別できるエラーにしない。
  it('ユーザーが存在しない場合もパスワード違いと同じエラーにする', async () => {
    const { useCase } = createUseCase(null);

    await expect(
      useCase.execute({ userId: 'unknown', password: PASSWORD }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('パスワード未設定のユーザーはログインさせない', async () => {
    const authRepository = createAuthRepository({
      credential: { id: INTERNAL_ID, passwordHash: null },
    });
    const useCase = new LogIn(authRepository, () => NOW);

    await expect(
      useCase.execute({ userId: USER_ID, password: PASSWORD }),
    ).rejects.toThrow(InvalidCredentialsError);
  });
});

describe('LogOut', () => {
  it('セッションを消す', async () => {
    const authRepository = createAuthRepository();
    const useCase = new LogOut(authRepository);

    await useCase.execute('abc123');

    expect(authRepository.deleteSession).toHaveBeenCalledWith(
      hashSessionToken('abc123'),
    );
  });

  it('tokenが無ければ何もしない', async () => {
    const authRepository = createAuthRepository();
    const useCase = new LogOut(authRepository);

    await expect(useCase.execute(null)).resolves.toBeUndefined();
    expect(authRepository.deleteSession).not.toHaveBeenCalled();
  });
});

describe('セッションtoken', () => {
  it('DBへ渡す値からtokenを復元できない', () => {
    const token = 'abc123';

    expect(hashSessionToken(token).toString('base64')).not.toContain(token);
  });
});
