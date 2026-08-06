import { useCallback } from 'react';

import {
  useCursorPagination,
  type CursorPage,
} from '../../../hooks/useCursorPagination';
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

/**
 * 取引履歴をカーソルページングで取得するフック。
 * 初回に1ページ目（最大20件）を読み込み、loadMoreで次ページを追記する。
 * 読み込み状態とカーソルの管理はuseCursorPaginationが持つ。
 */
export function useTransactions(): UseTransactionsResult {
  const fetchPage = useCallback(
    async (cursor: string | null): Promise<CursorPage<Transaction>> => {
      const page = await fetchTransactions(cursor);

      return { items: page.transactions, nextCursor: page.nextCursor };
    },
    [],
  );
  const { items, ...rest } = useCursorPagination(fetchPage);

  return { transactions: items, ...rest };
}
