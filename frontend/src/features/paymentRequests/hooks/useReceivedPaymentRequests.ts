import { useCallback } from 'react';

import {
  useCursorPagination,
  type CursorPage,
} from '../../../hooks/useCursorPagination';
import { fetchPaymentRequests } from '../api/paymentRequestsClient';
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
 * 取得は GET /api/payment-requests?direction=received&status=pending（Issue #70）。
 * ホーム画面は未対応の請求だけを出すため、statusで絞る。
 */
export function useReceivedPaymentRequests(): UseReceivedPaymentRequestsResult {
  const fetchPage = useCallback(
    async (cursor: string | null): Promise<CursorPage<PaymentRequest>> => {
      const page = await fetchPaymentRequests({
        direction: 'received',
        status: 'pending',
        cursor,
      });

      return { items: page.requests, nextCursor: page.nextCursor };
    },
    [],
  );
  const { items, ...rest } = useCursorPagination(fetchPage);

  return { requests: items, ...rest };
}
