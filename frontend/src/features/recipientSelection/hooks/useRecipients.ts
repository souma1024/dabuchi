import { useCallback, useMemo } from 'react';

import { useCursorPagination } from '../../../hooks/useCursorPagination';
import { fetchFriends } from '../../friends/api/friendsClient';
import type { Friend, FriendSort } from '../../friends/types';
import type { Recipient } from '../types';

/** 送金・請求相手一覧の取得結果と操作。 */
export interface UseRecipientsResult {
  recipients: Recipient[];
  isLoadingInitial: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  /** 友達を追加した後など、1ページ目から取り直す。 */
  reload: () => void;
}

/** 相手候補は友達なので、友達のプロフィールを一覧の表示形へ変換する。 */
function toRecipient({ friend }: Friend): Recipient {
  return { id: friend.id, name: friend.name, imageUrl: friend.profileUrl };
}

/**
 * 送金・請求の相手候補（＝友達）を取得するフック。
 * 取得とページングは友達一覧と同じものを使い、ここでは表示形への変換だけを担う。
 */
export function useRecipients(
  sort: FriendSort = 'created-asc',
): UseRecipientsResult {
  const fetchRecipientPage = useCallback(
    async (cursor: string | null, signal?: AbortSignal) => {
      const page = await fetchFriends(cursor, sort, signal);
      return { items: page.friends, nextCursor: page.nextCursor };
    },
    [sort],
  );
  const { items: friends, ...rest } = useCursorPagination(fetchRecipientPage);
  const recipients = useMemo(() => friends.map(toRecipient), [friends]);

  return { recipients, ...rest };
}
