import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchMockTransactionPage } from '../mockTransactions';
import {
  DEFAULT_TRANSACTION_SORT,
  type Transaction,
  type TransactionSort,
} from '../types';

/** 取引履歴一覧の取得結果と操作。 */
export interface UseTransactionsResult {
  transactions: Transaction[];
  isLoadingInitial: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
}

interface TransactionsState {
  sort: TransactionSort;
  transactions: Transaction[];
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
 * 取引履歴をカーソルページングで取得するフック。
 * 現在の取得元はモック。API連携（Issue #20）でクライアントを差し替える想定で、
 * 返り値の形は変えない。
 */
export function useTransactions(
  sort: TransactionSort = DEFAULT_TRANSACTION_SORT,
): UseTransactionsResult {
  const [state, setState] = useState<TransactionsState>(() => ({
    sort,
    transactions: [],
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

    void fetchMockTransactionPage(null, sort)
      .then((page) => {
        if (!active || generationRef.current !== generation) {
          return;
        }
        cursorRef.current = page.nextCursor;
        setState({
          sort,
          transactions: page.transactions,
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
            transactions: [],
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
  }, [sort]);

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

    void fetchMockTransactionPage(cursorRef.current, sort)
      .then((page) => {
        if (generationRef.current !== generation) {
          return;
        }
        cursorRef.current = page.nextCursor;
        setState((previous) => ({
          sort: previous.sort,
          transactions: [...previous.transactions, ...page.transactions],
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
  }, [sort]);

  const isStale = state.sort !== sort;
  const transactions = isStale ? [] : state.transactions;
  const isLoadingInitial = isStale ? true : state.isLoadingInitial;
  const isLoadingMore = isStale ? false : state.isLoadingMore;
  const error = isStale ? null : state.error;
  const hasMore = isStale ? false : state.nextCursor !== null;

  return {
    transactions,
    isLoadingInitial,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
  };
}
