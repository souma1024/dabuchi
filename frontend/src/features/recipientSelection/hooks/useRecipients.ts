import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchRecipients } from '../api/fetchRecipients';
import {
  DEFAULT_RECIPIENT_SORT,
  type Recipient,
  type RecipientSort,
} from '../types';

/** 送金相手一覧の取得結果と操作。 */
export interface UseRecipientsResult {
  recipients: Recipient[];
  isLoadingInitial: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
}

interface RecipientsState {
  sort: RecipientSort;
  recipients: Recipient[];
  isLoadingInitial: boolean;
  isLoadingMore: boolean;
  error: string | null;
  nextCursor: string | null;
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
export function useRecipients(
  currentUserId: string,
  sort: RecipientSort = DEFAULT_RECIPIENT_SORT,
): UseRecipientsResult {
  const [state, setState] = useState<RecipientsState>(() => ({
    sort,
    recipients: [],
    isLoadingInitial: true,
    isLoadingMore: false,
    error: null,
    nextCursor: null,
  }));

  const loadingRef = useRef(false);
  const cursorRef = useRef<string | null>(null);
  const generationRef = useRef(0);

  // 初回ロード（1ページ目）。
  useEffect(() => {
    let active = true;
    generationRef.current += 1;
    const generation = generationRef.current;
    loadingRef.current = true;
    cursorRef.current = null;

    void fetchRecipients(currentUserId, null, sort)
      .then((page) => {
        if (!active || generationRef.current !== generation) {
          return;
        }
        cursorRef.current = page.nextCursor;
        setState({
          sort,
          recipients: page.recipients,
          isLoadingInitial: false,
          isLoadingMore: false,
          error: null,
          nextCursor: page.nextCursor,
        });
      })
      .catch((caught: unknown) => {
        if (active && generationRef.current === generation) {
          setState({
            sort,
            recipients: [],
            isLoadingInitial: false,
            isLoadingMore: false,
            error: toErrorMessage(caught),
            nextCursor: null,
          });
        }
      })
      .finally(() => {
        if (!active || generationRef.current !== generation) {
          return;
        }
        loadingRef.current = false;
      });

    return () => {
      active = false;
    };
  }, [currentUserId, sort]);

  // 追加ロード（次ページ）。スクロール到達などのイベントから呼ぶ。
  const loadMore = useCallback(() => {
    if (loadingRef.current || cursorRef.current === null) {
      return;
    }
    loadingRef.current = true;
    setState((previous) => ({
      ...previous,
      isLoadingMore: true,
      error: null,
    }));
    const generation = generationRef.current;

    void fetchRecipients(currentUserId, cursorRef.current, sort)
      .then((page) => {
        if (generationRef.current !== generation) {
          return;
        }
        cursorRef.current = page.nextCursor;
        setState((previous) => ({
          sort: previous.sort,
          recipients: [...previous.recipients, ...page.recipients],
          isLoadingInitial: false,
          isLoadingMore: false,
          error: null,
          nextCursor: page.nextCursor,
        }));
      })
      .catch((caught: unknown) => {
        if (generationRef.current !== generation) {
          return;
        }
        setState((previous) => ({
          ...previous,
          isLoadingMore: false,
          error: toErrorMessage(caught),
        }));
      })
      .finally(() => {
        if (generationRef.current !== generation) {
          return;
        }
        loadingRef.current = false;
      });
  }, [currentUserId, sort]);

  const isStale = state.sort !== sort;
  const recipients = isStale ? [] : state.recipients;
  const isLoadingInitial = isStale ? true : state.isLoadingInitial;
  const isLoadingMore = isStale ? false : state.isLoadingMore;
  const error = isStale ? null : state.error;
  const hasMore = isStale ? false : state.nextCursor !== null;

  return {
    recipients,
    isLoadingInitial,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
  };
}
