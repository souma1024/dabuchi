import { createHash, randomBytes } from 'node:crypto';

/** セッションの有効期間。切れたら再ログインしてもらう。 */
export const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

const TOKEN_BYTES = 32;

/** ログイン中のセッション1件。 */
export interface Session {
  /** Cookieへ載せる値。DBには保存しない。 */
  token: string;
  /** 内部UUID。 */
  userId: string;
  expiresAt: Date;
}

/**
 * セッションtokenを作る。推測できないよう乱数から作り、値そのものはCookieでしか渡さない。
 */
export function createSessionToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

/**
 * DBに保存する形へ変換する。
 * tokenは検証時に完全一致で引くだけなので、ソルト無しのSHA-256で足りる
 * （パスワードと違い、元の値が十分な長さの乱数のため総当たりできない）。
 */
export function hashSessionToken(token: string): Buffer {
  return createHash('sha256').update(token).digest();
}

/** 現在時刻から有効期限を決める。 */
export function sessionExpiryFrom(now: Date): Date {
  return new Date(now.getTime() + SESSION_LIFETIME_MS);
}
