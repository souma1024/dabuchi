import type { Response } from 'express';

export const SESSION_COOKIE_NAME = 'dabuchi_session';

/**
 * Cookieヘッダから1つ取り出す。
 * 取り出すのはセッションtokenだけなので、cookie-parserを足さず自前で読む。
 */
export function readSessionToken(
  cookieHeader: string | undefined,
): string | null {
  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');

    if (separator === -1) {
      continue;
    }

    if (part.slice(0, separator).trim() !== SESSION_COOKIE_NAME) {
      continue;
    }

    const value = part.slice(separator + 1).trim();

    return value.length > 0 ? decodeURIComponent(value) : null;
  }

  return null;
}

/**
 * セッションtokenをCookieへ載せる。
 * httpOnlyでJavaScriptから読めなくし、sameSite=laxで他サイトからの送信を防ぐ。
 * secureは本番のみ。開発はhttpで動かすため、付けるとCookieが保存されない。
 */
export function setSessionCookie(
  response: Response,
  token: string,
  expiresAt: Date,
): void {
  response.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    path: '/',
  });
}

/** ログアウト時にCookieを消す。設定時と同じ属性でないとブラウザが消してくれない。 */
export function clearSessionCookie(response: Response): void {
  response.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}
