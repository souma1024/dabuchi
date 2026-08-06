import { useMemo } from 'react';

import { useFriends } from '../../friends/hooks/useFriends';
import type { Friend } from '../../friends/types';
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
export function useRecipients(): UseRecipientsResult {
  const { friends, ...rest } = useFriends();
  const recipients = useMemo(() => friends.map(toRecipient), [friends]);

  return { recipients, ...rest };
}
