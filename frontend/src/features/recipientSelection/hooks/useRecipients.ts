import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchFriends } from '../../friends/api/friendsClient';
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

function toErrorMessage(caught: unknown): string {
  return caught instanceof Error
    ? caught.message
    : '不明なエラーが発生しました';
}

/** 相手候補は友達なので、友達のプロフィールを一覧の表示形へ変換する。 */
function toRecipient({ friend }: Friend): Recipient {
  return { id: friend.id, name: friend.name, imageUrl: friend.profileUrl };
}

/**
 * 送金・請求の相手候補（＝友達）をカーソルページングで取得するフック。
 * 初回に1ページ目（最大20件）を読み込み、loadMoreで次ページを追記する。
 * 対象ユーザーはserver側のログイン中ユーザーから決まるため、画面からは指定しない。
 */
export function useRecipients(): UseRecipientsResult {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  // 友達追加のたびに1ページ目から取り直すためのトリガー。
  const [reloadCount, setReloadCount] = useState(0);

  const loadingRef = useRef(false);
  const cursorRef = useRef<string | null>(null);

  // 初回ロード（1ページ目）。reloadでも同じ経路を通す。
  useEffect(() => {
    let active = true;
    loadingRef.current = true;

    void fetchFriends(null)
      .then((page) => {
        if (!active) {
          return;
        }
        setRecipients(page.friends.map(toRecipient));
        cursorRef.current = page.nextCursor;
        setNextCursor(page.nextCursor);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(toErrorMessage(caught));
        }
      })
      .finally(() => {
        loadingRef.current = false;
        if (active) {
          setIsLoadingInitial(false);
        }
      });

    return () => {
      active = false;
    };
  }, [reloadCount]);

  // 追加ロード（次ページ）。スクロール到達などのイベントから呼ぶ。
  const loadMore = useCallback(() => {
    if (loadingRef.current || cursorRef.current === null) {
      return;
    }
    loadingRef.current = true;
    setIsLoadingMore(true);

    void fetchFriends(cursorRef.current)
      .then((page) => {
        setRecipients((prev) => [...prev, ...page.friends.map(toRecipient)]);
        cursorRef.current = page.nextCursor;
        setNextCursor(page.nextCursor);
        setError(null);
      })
      .catch((caught: unknown) => {
        setError(toErrorMessage(caught));
      })
      .finally(() => {
        loadingRef.current = false;
        setIsLoadingMore(false);
      });
  }, []);

  const reload = useCallback(() => {
    cursorRef.current = null;
    // 取り直しの間もローディング表示にする。effect内で立てると再レンダーが連鎖する。
    setIsLoadingInitial(true);
    setReloadCount((count) => count + 1);
  }, []);

  return {
    recipients,
    isLoadingInitial,
    isLoadingMore,
    error,
    hasMore: nextCursor !== null,
    loadMore,
    reload,
  };
}
