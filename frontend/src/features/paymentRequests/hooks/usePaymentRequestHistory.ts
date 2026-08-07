import { useCallback } from 'react';

import {
  useCursorPagination,
  type CursorPage,
} from '../../../hooks/useCursorPagination';
import { fetchPaymentRequests } from '../api/paymentRequestsClient';
import type { PaymentRequest, PaymentRequestDirection } from '../types';

/** 請求履歴の取得結果と操作。 */
export interface UsePaymentRequestHistoryResult {
  requests: PaymentRequest[];
  isLoadingInitial: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
}

/**
 * 指定した向きの請求履歴をカーソルページングで取得するフック（Issue #61）。
 * 未払いも決着済みも含めた全記録を返す。
 *
 * directionが変わるとfetchPageの同一性も変わるため、タブ切り替えで1ページ目から
 * 読み直す。読み込み済みの保持はしない。
 *
 * 取得は GET /api/payment-requests?direction=<direction>（Issue #70）。
 * statusで絞らないため、決着済みも含めた全記録が返る。
 */
export function usePaymentRequestHistory(
  direction: PaymentRequestDirection,
): UsePaymentRequestHistoryResult {
  const fetchPage = useCallback(
    async (cursor: string | null): Promise<CursorPage<PaymentRequest>> => {
      const page = await fetchPaymentRequests({ direction, cursor });

      return { items: page.requests, nextCursor: page.nextCursor };
    },
    [direction],
  );
  const { items, ...rest } = useCursorPagination(fetchPage);

  return { requests: items, ...rest };
}
