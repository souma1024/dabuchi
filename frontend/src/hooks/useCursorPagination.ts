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
  /** 一覧を変える操作の後などに、1ページ目から取り直す。 */
  reload: () => void;
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
 * 取得中にreloadすると、古い追加ページが後から届いて新しい一覧へ混ざる。
 * それを防ぐため世代番号を持ち、reloadで進めた後は古い世代の結果を捨てる。
 * AbortControllerでも打ち切るが、取り違えを防ぐのは世代番号の役目とし、
 * 打ち切りは無駄な通信を止めるためだけに使う。
 *
 * fetchPageは同一性が保たれている必要がある（モジュール直下の関数か、
 * useCallbackで包んだもの）。毎回新しい関数を渡すと初回ロードが繰り返される。
 */
export function useCursorPagination<T>(
  fetchPage: (
    cursor: string | null,
    signal?: AbortSignal,
  ) => Promise<CursorPage<T>>,
): UseCursorPaginationResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  // reloadのたびに進める世代番号。初回ロードのeffectを回す契機も兼ねる。
  const [generation, setGeneration] = useState(0);

  const loadingRef = useRef(false);
  const cursorRef = useRef<string | null>(null);
  // 世代の正はref側に置く。renderで書き戻すと、reload直後の再renderで巻き戻る余地が残る。
  const generationRef = useRef(0);
  // 進行中の追加取得。reload・取得対象の切り替え・アンマウントで打ち切る。
  const loadMoreAbortRef = useRef<AbortController | null>(null);

  // fetchPageが変わる＝取得対象が変わったということ。前の結果を消してから読み直す。
  // 残したままだと、取得が終わるまで前の一覧が新しい対象のものとして表示される
  // （例: 受けた請求のpendingが「請求中」として並ぶ）。
  // effect内でsetStateすると描画が連鎖するため、Reactが推奨する
  // 「propsの変更に合わせて描画中に調整する」書き方にしている。
  const [previousFetchPage, setPreviousFetchPage] = useState(() => fetchPage);

  if (previousFetchPage !== fetchPage) {
    setPreviousFetchPage(() => fetchPage);
    setItems([]);
    setNextCursor(null);
    setError(null);
    setIsLoadingInitial(true);
    setIsLoadingMore(false);
  }
  // loadMoreはeffectの外から呼ばれるためcleanupを持てない。
  // アンマウント後に状態を更新しないよう、マウント状態をrefで保持する。
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      loadMoreAbortRef.current?.abort();
    };
  }, []);

  // 初回ロード（1ページ目）。reloadでも同じ経路を通す。
  useEffect(() => {
    let active = true;
    // 取得対象の切り替えでもreloadでもここへ来る。進行中の追加取得は捨てる。
    // refは描画中に触れないため、リセットはここで行う。
    generationRef.current += 1;
    loadMoreAbortRef.current?.abort();
    loadMoreAbortRef.current = null;
    loadingRef.current = true;
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
  }, [fetchPage, generation]);

  // 追加ロード（次ページ）。スクロール到達などのイベントから呼ぶ。
  const loadMore = useCallback(() => {
    if (loadingRef.current || cursorRef.current === null) {
      return;
    }
    loadingRef.current = true;
    setIsLoadingMore(true);

    const requestedGeneration = generationRef.current;
    const controller = new AbortController();
    loadMoreAbortRef.current = controller;

    void fetchPage(cursorRef.current, controller.signal)
      .then((page) => {
        // reload後に届いた古いページは、一覧にもカーソルにも反映しない。
        if (requestedGeneration !== generationRef.current) {
          return;
        }
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
        if (
          requestedGeneration === generationRef.current &&
          mountedRef.current
        ) {
          setError(toErrorMessage(caught));
        }
      })
      .finally(() => {
        if (requestedGeneration !== generationRef.current) {
          return;
        }
        loadingRef.current = false;
        if (mountedRef.current) {
          setIsLoadingMore(false);
        }
      });
  }, [fetchPage]);

  const reload = useCallback(() => {
    // 進行中の追加取得の打ち切りとカーソルの巻き戻しは、取得し直すeffectがまとめて行う。
    setIsLoadingMore(false);
    // 取り直しの間もローディング表示にする。effect内で立てると再レンダーが連鎖する。
    setIsLoadingInitial(true);
    setGeneration((current) => current + 1);
  }, []);

  return {
    items,
    isLoadingInitial,
    isLoadingMore,
    error,
    hasMore: nextCursor !== null,
    loadMore,
    reload,
  };
}
