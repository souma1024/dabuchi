import { useEffect } from 'react';

/**
 * 画面の先頭へ戻す。
 *
 * カーソルページングの一覧は、離れて戻ると1ページ目だけ再取得される。
 * ブラウザは元のスクロール位置を復元しようとするが、そこにはもう項目が無く、
 * 中途半端な場所で止まってしまう。読み込み直した内容と位置を合わせる。
 *
 * @param deps 先頭へ戻す契機。省略するとマウント時のみ。タブの切り替えなどを渡す。
 */
export function useScrollToTop(deps: readonly unknown[] = []) {
  useEffect(() => {
    window.scrollTo(0, 0);
    // 契機は呼び出し側が決める。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
