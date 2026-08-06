import { useCallback } from 'react';

import {
  useCursorPagination,
  type CursorPage,
} from '../../../hooks/useCursorPagination';
import { fetchMockReceivedPaymentRequestPage } from '../mockPaymentRequests';
import type { PaymentRequest } from '../types';

/** 受けた請求（未払い）の取得結果と操作。 */
export interface UseReceivedPaymentRequestsResult {
  requests: PaymentRequest[];
  isLoadingInitial: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
}

/**
 * 自分宛の未払いの請求をカーソルページングで取得するフック。
 * 初回に1ページ目（最大20件）を読み込み、loadMoreで次ページを追記する（Issue #44）。
 *
 * 現在の取得元はモック。請求一覧API（Issue #70）でクライアントを差し替える想定で、
 * 返り値の形は変えない。
 */
export function useReceivedPaymentRequests(): UseReceivedPaymentRequestsResult {
  const fetchPage = useCallback(
    async (cursor: string | null): Promise<CursorPage<PaymentRequest>> => {
      const page = await fetchMockReceivedPaymentRequestPage(cursor);

      return { items: page.requests, nextCursor: page.nextCursor };
    },
    [],
  );
  const { items, ...rest } = useCursorPagination(fetchPage);

  return { requests: items, ...rest };
}
