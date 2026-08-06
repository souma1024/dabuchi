import { useCursorPagination } from '../../../hooks/useCursorPagination';
import { fetchFriends } from '../api/friendsClient';
import type { Friend } from '../types';

/** 友達一覧の取得結果と操作。 */
export interface UseFriendsResult {
  friends: Friend[];
  isLoadingInitial: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  /** 友達を追加・ブロックした後など、1ページ目から取り直す。 */
  reload: () => void;
}

// フックへ渡す関数は同一性を保つ必要があるため、モジュール直下に置く。
async function fetchFriendPage(cursor: string | null, signal?: AbortSignal) {
  const page = await fetchFriends(cursor, signal);
  return { items: page.friends, nextCursor: page.nextCursor };
}

/**
 * 友達をカーソルページングで取得するフック。
 * 対象ユーザーはserver側のログイン中ユーザーから決まるため、画面からは指定しない。
 */
export function useFriends(): UseFriendsResult {
  const { items, ...rest } = useCursorPagination(fetchFriendPage);

  return { friends: items, ...rest };
}
