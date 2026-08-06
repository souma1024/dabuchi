import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchMockTransactionPage } from '../mockTransactions';
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
 * 現在の取得元はモック。API連携（Issue #20）でクライアントを差し替える想定で、
 * 返り値の形は変えない。
 */
export function useTransactions(): UseTransactionsResult {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
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

    void fetchMockTransactionPage(null)
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

    void fetchMockTransactionPage(cursorRef.current)
      .then((page) => {
        setTransactions((prev) => [...prev, ...page.transactions]);
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

  return {
    transactions,
    isLoadingInitial,
    isLoadingMore,
    error,
    hasMore: nextCursor !== null,
    loadMore,
  };
}
