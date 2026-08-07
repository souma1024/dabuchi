import { describe, expect, it, vi } from 'vitest';

import {
  clearSessionCookie,
  readSessionToken,
  SESSION_COOKIE_NAME,
  setSessionCookie,
} from './sessionCookie.js';

describe('readSessionToken', () => {
  it('セッションtokenを取り出す', () => {
    expect(readSessionToken(`${SESSION_COOKIE_NAME}=abc123`)).toBe('abc123');
  });

  it('他のCookieが並んでいても取り出す', () => {
    expect(
      readSessionToken(`theme=dark; ${SESSION_COOKIE_NAME}=abc123; lang=ja`),
    ).toBe('abc123');
  });

  it('名前が前方一致する別のCookieを取り違えない', () => {
    expect(readSessionToken(`${SESSION_COOKIE_NAME}_old=abc123`)).toBeNull();
  });

  it.each([
    ['ヘッダが無い', undefined],
    ['空文字', ''],
    ['対象のCookieが無い', 'theme=dark'],
    ['値が空', `${SESSION_COOKIE_NAME}=`],
    ['=が無い', 'broken'],
  ])('取り出せなければnullを返す: %s', (_case, header) => {
    expect(readSessionToken(header)).toBeNull();
  });
});

function createResponse() {
  return {
    cookie: vi.fn(),
    clearCookie: vi.fn(),
  };
}

describe('setSessionCookie', () => {
  it('JavaScriptから読めず、他サイトからは送られない設定にする', () => {
    const response = createResponse();
    const expiresAt = new Date('2026-08-13T00:00:00.000Z');

    setSessionCookie(
      response as unknown as Parameters<typeof setSessionCookie>[0],
      'abc123',
      expiresAt,
    );

    expect(response.cookie).toHaveBeenCalledWith(
      SESSION_COOKIE_NAME,
      'abc123',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        expires: expiresAt,
        path: '/',
      }),
    );
  });
});

describe('clearSessionCookie', () => {
  it('設定時と同じ属性で消す', () => {
    const response = createResponse();

    clearSessionCookie(
      response as unknown as Parameters<typeof clearSessionCookie>[0],
    );

    // 属性が違うとブラウザが同じCookieだと判断せず、消えないままになる。
    expect(response.clearCookie).toHaveBeenCalledWith(
      SESSION_COOKIE_NAME,
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' }),
    );
  });
});
