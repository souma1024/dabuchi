import { useCursorPagination } from '../../../hooks/useCursorPagination';
import { fetchBlockedFriends } from '../api/friendsClient';
import type { BlockedFriend } from '../types';

/** ブロック中の友達一覧の取得結果と操作。 */
export interface UseBlockedFriendsResult {
  friends: BlockedFriend[];
  isLoadingInitial: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  /** ブロックを解除した後など、1ページ目から取り直す。 */
  reload: () => void;
}

// フックへ渡す関数は同一性を保つ必要があるため、モジュール直下に置く。
async function fetchBlockedFriendPage(
  cursor: string | null,
  signal?: AbortSignal,
) {
  const page = await fetchBlockedFriends(cursor, signal);
  return { items: page.friends, nextCursor: page.nextCursor };
}

/**
 * ブロック中の友達をカーソルページングで取得するフック。
 * 解除しても一覧からは即座に消さず、画面側で「ブロック中」表示を切り替える。
 */
export function useBlockedFriends(): UseBlockedFriendsResult {
  const { items, ...rest } = useCursorPagination(fetchBlockedFriendPage);

  return { friends: items, ...rest };
}
