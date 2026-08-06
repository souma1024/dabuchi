import { useCallback, useEffect, useRef } from 'react';

// 目印は高さ1pxで一覧の末尾に置くため、最下端まで送ってもviewportの境界と
// 重なるだけで交差と判定されないことがある。手前から監視して確実に発火させる。
const ROOT_MARGIN = '200px';

/**
 * 一覧の末尾に置いた目印が画面に入ったら、続きを読み込むためのフック。
 *
 * カーソルページングの一覧（取引履歴・請求一覧・相手選択・友達管理）で同じ処理が
 * 必要になるため、useCursorPaginationと対で使えるように切り出している。
 *
 * 返った関数を、リストの最後の要素のrefへ渡す。hasMoreがfalseのときは要素自体を
 * 描画しない想定で、その間は監視も止まる。
 *
 * refをオブジェクトではなく関数で返すのは、目印が「後から」現れるため。
 * 1ページ目の取得が終わるまで目印は描画されないので、effectの依存配列で監視をやり直す
 * 作りだと、依存の指定漏れでいつまでも監視が始まらない。
 * 関数refなら、要素が付いた瞬間と外れた瞬間にReactが呼ぶため取りこぼさない。
 *
 * @param loadMore 目印が見えたときに呼ぶ。
 */
export function useInfiniteScrollSentinel<T extends Element>(
  loadMore: () => void,
): (node: T | null) => void {
  const loadMoreRef = useRef(loadMore);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // 監視を作り直さずに済むよう、最新のloadMoreはrefから呼ぶ。
  useEffect(() => {
    loadMoreRef.current = loadMore;
  }, [loadMore]);

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return useCallback((node: T | null) => {
    observerRef.current?.disconnect();

    if (!node) {
      observerRef.current = null;
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMoreRef.current();
        }
      },
      { rootMargin: ROOT_MARGIN },
    );

    observer.observe(node);
    observerRef.current = observer;
  }, []);
}
