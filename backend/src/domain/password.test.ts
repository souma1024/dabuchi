import { describe, expect, it } from 'vitest';

import {
  hashPassword,
  InvalidPasswordError,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  verifyPassword,
} from './password.js';

describe('hashPassword', () => {
  it('同じパスワードでも毎回違う値になる', async () => {
    const first = await hashPassword('correct horse battery');
    const second = await hashPassword('correct horse battery');

    // ソルトが毎回変わるため、同じ入力でも保存値は一致しない。
    expect(first).not.toBe(second);
    // パラメータを含む形式で保存し、後から強度を上げても検証できるようにする。
    expect(first.startsWith('scrypt$16384$8$1$')).toBe(true);
  });

  it('パスワードそのものを保存値へ含めない', async () => {
    const stored = await hashPassword('correct horse battery');

    expect(stored).not.toContain('correct horse battery');
  });

  it.each([
    ['短すぎる', 'a'.repeat(PASSWORD_MIN_LENGTH - 1)],
    ['長すぎる', 'a'.repeat(PASSWORD_MAX_LENGTH + 1)],
  ])('%sパスワードを拒否する', async (_case, password) => {
    await expect(hashPassword(password)).rejects.toThrow(InvalidPasswordError);
  });

  it('絵文字を含む長さは文字数で数える', async () => {
    // サロゲートペアをlengthで数えると、7文字でも通ってしまう。
    await expect(hashPassword('🐴'.repeat(4))).rejects.toThrow(
      InvalidPasswordError,
    );
  });
});

describe('verifyPassword', () => {
  it('保存した値と一致するパスワードを受け入れる', async () => {
    const stored = await hashPassword('correct horse battery');

    await expect(verifyPassword('correct horse battery', stored)).resolves.toBe(
      true,
    );
  });

  it('違うパスワードを拒否する', async () => {
    const stored = await hashPassword('correct horse battery');

    await expect(verifyPassword('correct horse batteru', stored)).resolves.toBe(
      false,
    );
  });

  it.each([
    ['空文字', ''],
    ['区切りが足りない', 'scrypt$16384$8$1$salt'],
    ['別のアルゴリズム', 'bcrypt$16384$8$1$c2FsdA==$a2V5'],
    ['コストが数値でない', 'scrypt$many$8$1$c2FsdA==$a2V5'],
  ])('保存値が壊れていれば例外にせず拒否する: %s', async (_case, stored) => {
    await expect(verifyPassword('correct horse battery', stored)).resolves.toBe(
      false,
    );
  });
});
