import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchTransactions } from '../api/transactionsClient';
import type { Transaction } from '../types';

/** 取引履歴一覧の取得結果と操作。 */
export interface UseTransactionsResult {
  transactions: Transaction[];
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
 * 取引履歴をカーソルページングで取得するフック。
 * 初回に1ページ目（最大20件）を読み込み、loadMoreで次ページを追記する。
 */
export function useTransactions(): UseTransactionsResult {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const loadingRef = useRef(false);
  const cursorRef = useRef<string | null>(null);
  // loadMoreはeffectの外から呼ばれるためcleanupを持てない。
  // アンマウント後に状態を更新しないよう、マウント状態をrefで保持する。
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 初回ロード（1ページ目）。
  useEffect(() => {
    let active = true;
    loadingRef.current = true;

    void fetchTransactions(null)
      .then((page) => {
        if (!active) {
          return;
        }
        setTransactions(page.transactions);
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
  }, []);

  // 追加ロード（次ページ）。スクロール到達などのイベントから呼ぶ。
  const loadMore = useCallback(() => {
    if (loadingRef.current || cursorRef.current === null) {
      return;
    }
    loadingRef.current = true;
    setIsLoadingMore(true);

    void fetchTransactions(cursorRef.current)
      .then((page) => {
        // カーソルは次回のリクエストに使うため、アンマウント後でも進めておく。
        cursorRef.current = page.nextCursor;
        if (!mountedRef.current) {
          return;
        }
        setTransactions((prev) => [...prev, ...page.transactions]);
        setNextCursor(page.nextCursor);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (mountedRef.current) {
          setError(toErrorMessage(caught));
        }
      })
      .finally(() => {
        loadingRef.current = false;
        if (mountedRef.current) {
          setIsLoadingMore(false);
        }
      });
  }, []);

  return {
    transactions,
    isLoadingInitial,
    isLoadingMore,
    error,
    hasMore: nextCursor !== null,
    loadMore,
  };
}
