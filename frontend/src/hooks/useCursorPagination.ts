import { useCallback, useEffect, useRef, useState } from 'react';

/** カーソルページングの1ページ分。 */
export interface CursorPage<T> {
  items: T[];
  /** 次ページが無ければnull。 */
  nextCursor: string | null;
}

/** 取得結果と操作。 */
export interface UseCursorPaginationResult<T> {
  items: T[];
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
 * カーソルページングで一覧を取得する汎用フック。
 * 初回に1ページ目を読み込み、loadMoreで次ページを追記する。
 *
 * 取引履歴・請求一覧のように「20件ずつ取ってスクロールで足す」画面が複数あり、
 * 読み込み状態・エラー・カーソルの管理が同じになるため共通化している。
 *
 * fetchPageは同一性が保たれている必要がある（モジュール直下の関数か、
 * useCallbackで包んだもの）。毎回新しい関数を渡すと初回ロードが繰り返される。
 */
export function useCursorPagination<T>(
  fetchPage: (cursor: string | null) => Promise<CursorPage<T>>,
): UseCursorPaginationResult<T> {
  const [items, setItems] = useState<T[]>([]);
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

    // fetchPageが変わる＝取得対象が変わったということ。前の結果を消してから読み直す。
    // 残したままだと、取得が終わるまで前の一覧が新しい対象のものとして表示される
    // （例: 受けた請求のpendingが「請求中」として並ぶ）。
    setItems([]);
    setNextCursor(null);
    setError(null);
    setIsLoadingInitial(true);
    cursorRef.current = null;

    void fetchPage(null)
      .then((page) => {
        if (!active) {
          return;
        }
        setItems(page.items);
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
  }, [fetchPage]);

  // 追加ロード（次ページ）。スクロール到達などのイベントから呼ぶ。
  const loadMore = useCallback(() => {
    if (loadingRef.current || cursorRef.current === null) {
      return;
    }
    loadingRef.current = true;
    setIsLoadingMore(true);

    void fetchPage(cursorRef.current)
      .then((page) => {
        // カーソルは次回のリクエストに使うため、アンマウント後でも進めておく。
        cursorRef.current = page.nextCursor;
        if (!mountedRef.current) {
          return;
        }
        setItems((prev) => [...prev, ...page.items]);
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
  }, [fetchPage]);

  return {
    items,
    isLoadingInitial,
    isLoadingMore,
    error,
    hasMore: nextCursor !== null,
    loadMore,
  };
}
