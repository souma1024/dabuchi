import { useCallback, useEffect, useRef, useState } from 'react';

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

function toErrorMessage(caught: unknown): string {
  return caught instanceof Error
    ? caught.message
    : '不明なエラーが発生しました';
}

/**
 * 自分宛の未払いの請求をカーソルページングで取得するフック。
 * 初回に3件読み込み、loadMoreで同じ画面内に追記する（Issue #44）。
 * 現在の取得元はモック。API連携（Issue #70）でクライアントを差し替える想定で、
 * 返り値の形は変えない。
 */
export function useReceivedPaymentRequests(): UseReceivedPaymentRequestsResult {
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
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

    void fetchMockReceivedPaymentRequestPage(null)
      .then((page) => {
        if (!active) {
          return;
        }
        setRequests(page.requests);
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

  // 追加ロード（次ページ）。「もっと見る」から呼ぶ。
  const loadMore = useCallback(() => {
    if (loadingRef.current || cursorRef.current === null) {
      return;
    }
    loadingRef.current = true;
    setIsLoadingMore(true);

    void fetchMockReceivedPaymentRequestPage(cursorRef.current)
      .then((page) => {
        setRequests((prev) => [...prev, ...page.requests]);
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
    requests,
    isLoadingInitial,
    isLoadingMore,
    error,
    hasMore: nextCursor !== null,
    loadMore,
  };
}
