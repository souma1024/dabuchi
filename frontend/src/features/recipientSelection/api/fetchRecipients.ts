import type { Recipient } from '../types';

// 未設定なら同一オリジン（Vite dev serverの /api プロキシ経由）を使う。
const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '';

/** バックエンド GET /api/users/:currentUserId/recipients のレスポンス要素。 */
interface RecipientResponseUser {
  id: string;
  name: string;
  profileUrl: string;
}

interface RecipientsResponse {
  users: RecipientResponseUser[];
  pageInfo: {
    nextCursor: string | null;
    hasNextPage: boolean;
  };
}

/** 相手候補の1ページ分。 */
export interface RecipientPage {
  recipients: Recipient[];
  nextCursor: string | null;
}

function invalidResponseError(): Error {
  return new Error('送金相手の取得に失敗しました（不正なレスポンス）');
}

function isRecipientUser(value: unknown): value is RecipientResponseUser {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const user = value as Record<string, unknown>;
  return (
    typeof user.id === 'string' &&
    typeof user.name === 'string' &&
    typeof user.profileUrl === 'string'
  );
}

/** 外部入力であるレスポンスを実行時に検証する（型を盲信しない）。 */
function parseRecipientsResponse(data: unknown): RecipientsResponse {
  if (typeof data !== 'object' || data === null) {
    throw invalidResponseError();
  }
  const body = data as Record<string, unknown>;

  const rawUsers = body.users;
  if (!Array.isArray(rawUsers)) {
    throw invalidResponseError();
  }
  const users: RecipientResponseUser[] = [];
  for (const item of rawUsers as unknown[]) {
    if (!isRecipientUser(item)) {
      throw invalidResponseError();
    }
    users.push(item);
  }

  const pageInfo = body.pageInfo;
  if (typeof pageInfo !== 'object' || pageInfo === null) {
    throw invalidResponseError();
  }
  const info = pageInfo as Record<string, unknown>;
  const nextCursor = info.nextCursor;
  const hasNextPage = info.hasNextPage;
  if (nextCursor !== null && typeof nextCursor !== 'string') {
    throw invalidResponseError();
  }
  if (typeof hasNextPage !== 'boolean') {
    throw invalidResponseError();
  }

  return { users, pageInfo: { nextCursor, hasNextPage } };
}

function buildRecipientsUrl(currentUserId: string, cursor: string | null): URL {
  const base = API_BASE_URL || window.location.origin;
  const url = new URL(
    `/api/users/${encodeURIComponent(currentUserId)}/recipients`,
    base,
  );
  if (cursor) {
    url.searchParams.set('cursor', cursor);
  }
  return url;
}

/**
 * 送金相手候補を1ページ分（最大20件）取得する。
 * 自分の除外・登録順の並び替え・ページングはバックエンドの責務。
 * 追加ページは呼び出し側(useRecipients)がnextCursorを使って取得する。
 */
export async function fetchRecipients(
  currentUserId: string,
  cursor: string | null = null,
  signal?: AbortSignal,
): Promise<RecipientPage> {
  const response = await fetch(buildRecipientsUrl(currentUserId, cursor), {
    signal,
  });
  if (!response.ok) {
    throw new Error(`送金相手の取得に失敗しました (HTTP ${response.status})`);
  }

  const data: unknown = await response.json();
  const parsed = parseRecipientsResponse(data);

  return {
    recipients: parsed.users.map((user) => ({
      id: user.id,
      name: user.name,
      imageUrl: user.profileUrl,
    })),
    nextCursor: parsed.pageInfo.nextCursor,
  };
}
