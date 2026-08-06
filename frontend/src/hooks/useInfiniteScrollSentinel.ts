import { useEffect, useRef } from 'react';

/**
 * 一覧の末尾に置いた目印が画面に入ったら、続きを読み込むためのフック。
 *
 * カーソルページングの一覧（取引履歴・請求一覧・相手選択）で同じ処理が必要になるため、
 * useCursorPaginationと対で使えるように切り出している。
 *
 * 返ったrefを、リストの最後の要素へ付ける。hasMoreがfalseのときは要素自体を描画しない
 * 想定のため、監視も始まらない。
 *
 * @param loadMore 目印が見えたときに呼ぶ。useCallbackで同一性を保つこと。
 * @param deps 監視をやり直す契機。読み込み済み件数などを渡す。
 */
export function useInfiniteScrollSentinel<T extends Element>(
  loadMore: () => void,
  deps: readonly unknown[] = [],
) {
  const sentinelRef = useRef<T | null>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        loadMore();
      }
    });

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
    // depsは呼び出し側が決める（件数の変化などで監視をやり直す）。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadMore, ...deps]);

  return sentinelRef;
}
