import type { Recipient } from '../types';

// 未設定なら同一オリジン（Vite dev serverの /api プロキシ経由）を使う。
const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '';

// 想定外のページ数で無限ループしないための安全上限。
const MAX_PAGES = 100;

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
 * 自分以外のユーザー一覧（送金相手候補）を取得する。
 *
 * バックエンドはカーソルページング（20件/ページ）のため、ワイヤーフレームの
 * 「自分以外の全ユーザーを登録順で表示する」に合わせて全ページを辿って連結する。
 * 自分の除外・登録順の並び替えはバックエンドの責務。
 * 相手が数十人を超えたら、全件取得ではなく無限スクロール等への見直しが必要。
 */
export async function fetchRecipients(
  currentUserId: string,
  signal?: AbortSignal,
): Promise<Recipient[]> {
  const recipients: Recipient[] = [];
  let cursor: string | null = null;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const response = await fetch(buildRecipientsUrl(currentUserId, cursor), {
      signal,
    });
    if (!response.ok) {
      throw new Error(`送金相手の取得に失敗しました (HTTP ${response.status})`);
    }

    const data = (await response.json()) as RecipientsResponse;
    for (const user of data.users) {
      recipients.push({
        id: user.id,
        name: user.name,
        imageUrl: user.profileUrl,
      });
    }

    if (!data.pageInfo.hasNextPage || !data.pageInfo.nextCursor) {
      break;
    }
    cursor = data.pageInfo.nextCursor;
  }

  return recipients;
}
