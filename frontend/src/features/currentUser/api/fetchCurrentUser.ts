import type { CurrentUser } from '../types';

// 未設定なら同一オリジン（Vite dev serverの /api プロキシ経由）を使う。
const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '';

function invalidResponseError(): Error {
  return new Error('ユーザー情報の取得に失敗しました（不正なレスポンス）');
}

function isCurrentUser(value: unknown): value is CurrentUser {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const user = value as Record<string, unknown>;
  return (
    typeof user.id === 'string' &&
    typeof user.userId === 'string' &&
    typeof user.name === 'string' &&
    typeof user.profileUrl === 'string' &&
    // balanceはAPI仕様で円単位の非負整数。負数・小数・桁あふれは不正として扱う。
    typeof user.balance === 'number' &&
    Number.isSafeInteger(user.balance) &&
    user.balance >= 0
  );
}

/** 外部入力であるレスポンスを実行時に検証する（型を盲信しない）。 */
function parseCurrentUserResponse(data: unknown): CurrentUser {
  if (typeof data !== 'object' || data === null) {
    throw invalidResponseError();
  }
  const user = (data as Record<string, unknown>).user;
  if (!isCurrentUser(user)) {
    throw invalidResponseError();
  }
  return user;
}

/**
 * 現在ユーザーを取得する。
 * ログイン実装までは、バックエンドがMOCK_USER_IDで解決したユーザーを返す。
 */
export async function fetchCurrentUser(
  signal?: AbortSignal,
): Promise<CurrentUser> {
  const base = API_BASE_URL || window.location.origin;
  const response = await fetch(new URL('/api/me', base), { signal });
  if (!response.ok) {
    throw new Error(
      `ユーザー情報の取得に失敗しました (HTTP ${response.status})`,
    );
  }

  const data: unknown = await response.json();
  return parseCurrentUserResponse(data);
}
