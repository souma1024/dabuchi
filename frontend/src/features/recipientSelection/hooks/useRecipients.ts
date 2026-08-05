import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchRecipients } from '../api/fetchRecipients';
import type { Recipient } from '../types';

/** 送金相手一覧の取得結果と操作。 */
export interface UseRecipientsResult {
  recipients: Recipient[];
  isLoadingInitial: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
}

function toErrorMessage(caught: unknown): string {
  return caught instanceof Error
    ? caught.message
    : '不明なエラーが発生しました';
}

/**
 * 送金相手一覧をカーソルページングで取得するフック。
 * 初回に1ページ目（最大20件）を読み込み、loadMoreで次ページを追記する。
 */
export function useRecipients(currentUserId: string): UseRecipientsResult {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const loadingRef = useRef(false);
  const cursorRef = useRef<string | null>(null);

  // 初回ロード（1ページ目）。
  useEffect(() => {
    let active = true;
    loadingRef.current = true;

    void fetchRecipients(currentUserId, null)
      .then((page) => {
        if (!active) {
          return;
        }
        setRecipients(page.recipients);
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
  }, [currentUserId]);

  // 追加ロード（次ページ）。スクロール到達などのイベントから呼ぶ。
  const loadMore = useCallback(() => {
    if (loadingRef.current || cursorRef.current === null) {
      return;
    }
    loadingRef.current = true;
    setIsLoadingMore(true);

    void fetchRecipients(currentUserId, cursorRef.current)
      .then((page) => {
        setRecipients((prev) => [...prev, ...page.recipients]);
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
  }, [currentUserId]);

  return {
    recipients,
    isLoadingInitial,
    isLoadingMore,
    error,
    hasMore: nextCursor !== null,
    loadMore,
  };
}
