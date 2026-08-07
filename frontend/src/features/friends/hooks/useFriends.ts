import { useCallback } from 'react';

import { useCursorPagination } from '../../../hooks/useCursorPagination';
import { fetchFriends } from '../api/friendsClient';
import type { Friend, FriendSort } from '../types';

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

/**
 * 友達をカーソルページングで取得するフック。
 * 対象ユーザーはserver側のログイン中ユーザーから決まるため、画面からは指定しない。
 */
export function useFriends(sort: FriendSort = 'created-asc'): UseFriendsResult {
  const fetchFriendPage = useCallback(
    async (cursor: string | null, signal?: AbortSignal) => {
      const page = await fetchFriends(cursor, sort, signal);
      return { items: page.friends, nextCursor: page.nextCursor };
    },
    [sort],
  );
  const { items, ...rest } = useCursorPagination(fetchFriendPage);

  return { friends: items, ...rest };
}
