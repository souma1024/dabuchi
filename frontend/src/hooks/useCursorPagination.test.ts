import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useCursorPagination, type CursorPage } from './useCursorPagination';

function createPage(items: string[], nextCursor: string | null) {
  return { items, nextCursor } satisfies CursorPage<string>;
}

describe('useCursorPagination', () => {
  it('初回に1ページ目を読み込む', async () => {
    const fetchPage = vi.fn().mockResolvedValue(createPage(['a', 'b'], '2'));

    const { result } = renderHook(() => useCursorPagination(fetchPage));

    await waitFor(() => {
      expect(result.current.isLoadingInitial).toBe(false);
    });
    expect(result.current.items).toEqual(['a', 'b']);
    expect(result.current.hasMore).toBe(true);
    expect(fetchPage).toHaveBeenCalledWith(null);
  });

  it('loadMoreで次ページを追記する', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce(createPage(['a'], '1'))
      .mockResolvedValueOnce(createPage(['b'], null));
    const { result } = renderHook(() => useCursorPagination(fetchPage));
    await waitFor(() => {
      expect(result.current.isLoadingInitial).toBe(false);
    });

    act(() => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.items).toEqual(['a', 'b']);
    });
    expect(fetchPage).toHaveBeenLastCalledWith('1', expect.any(AbortSignal));
    expect(result.current.hasMore).toBe(false);
  });

  it('次ページが無ければloadMoreで取得しない', async () => {
    const fetchPage = vi.fn().mockResolvedValue(createPage(['a'], null));
    const { result } = renderHook(() => useCursorPagination(fetchPage));
    await waitFor(() => {
      expect(result.current.isLoadingInitial).toBe(false);
    });

    act(() => {
      result.current.loadMore();
    });

    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  // スクロールで連続して発火しても、同じページを二重に取得しない。
  it('読み込み中のloadMoreを無視する', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce(createPage(['a'], '1'))
      // 2回目は解決しないPromiseを返し、読み込み中の状態を保つ。
      .mockImplementation(
        () => new Promise<CursorPage<string>>(() => undefined),
      );
    const { result } = renderHook(() => useCursorPagination(fetchPage));
    await waitFor(() => {
      expect(result.current.isLoadingInitial).toBe(false);
    });

    act(() => {
      result.current.loadMore();
      result.current.loadMore();
    });

    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  // 取得対象が変わったのに前の結果が残ると、別の対象のものとして表示されてしまう。
  it('fetchPageが変わったら前の結果を消して読み直す', async () => {
    const first = vi.fn().mockResolvedValue(createPage(['a'], '1'));
    const second = vi
      .fn()
      .mockImplementation(
        () => new Promise<CursorPage<string>>(() => undefined),
      );
    const { result, rerender } = renderHook(
      ({ fetchPage }) => useCursorPagination(fetchPage),
      { initialProps: { fetchPage: first } },
    );
    await waitFor(() => {
      expect(result.current.items).toEqual(['a']);
    });

    rerender({ fetchPage: second });

    // 2つ目の取得は解決しないため、前の結果が残っていれば検出できる。
    expect(result.current.items).toEqual([]);
    expect(result.current.isLoadingInitial).toBe(true);
    expect(result.current.hasMore).toBe(false);
  });

  it('初回の失敗をエラーとして返す', async () => {
    const fetchPage = vi
      .fn()
      .mockRejectedValue(new Error('取得に失敗しました'));

    const { result } = renderHook(() => useCursorPagination(fetchPage));

    await waitFor(() => {
      expect(result.current.error).toBe('取得に失敗しました');
    });
    expect(result.current.isLoadingInitial).toBe(false);
  });

  it('Error以外がthrowされても文言を返す', async () => {
    const fetchPage = vi.fn().mockRejectedValue('文字列');

    const { result } = renderHook(() => useCursorPagination(fetchPage));

    await waitFor(() => {
      expect(result.current.error).toBe('不明なエラーが発生しました');
    });
  });

  // アンマウント後にsetStateするとReactが警告するため、更新しないことを確認する。
  it('アンマウント後に状態を更新しない', async () => {
    let resolveSecond: ((page: CursorPage<string>) => void) | null = null;
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce(createPage(['a'], '1'))
      .mockImplementationOnce(
        () =>
          new Promise<CursorPage<string>>((resolve) => {
            resolveSecond = resolve;
          }),
      );
    const { result, unmount } = renderHook(() =>
      useCursorPagination(fetchPage),
    );
    await waitFor(() => {
      expect(result.current.isLoadingInitial).toBe(false);
    });
    act(() => {
      result.current.loadMore();
    });

    unmount();
    await act(async () => {
      resolveSecond?.(createPage(['b'], null));
      await Promise.resolve();
    });

    // アンマウント前の値のまま。追記されていない。
    expect(result.current.items).toEqual(['a']);
  });

  // reloadと進行中のloadMoreが競合すると、古いページが新しい一覧へ混ざりうる。
  describe('reload', () => {
    /** 解決タイミングを手で操作できるfetchPage。 */
    function createDeferredFetch() {
      const resolvers: ((page: CursorPage<string>) => void)[] = [];
      const cursors: (string | null)[] = [];

      const fetchPage = vi.fn((cursor: string | null) => {
        cursors.push(cursor);
        return new Promise<CursorPage<string>>((resolve) => {
          resolvers.push(resolve);
        });
      });

      return { fetchPage, resolvers, cursors };
    }

    it('reload前に始めた追加取得の結果は捨てる', async () => {
      const { fetchPage, resolvers, cursors } = createDeferredFetch();
      const { result } = renderHook(() => useCursorPagination(fetchPage));

      await act(async () => {
        resolvers[0]?.(createPage(['a'], 'C1'));
        await Promise.resolve();
      });

      // 2ページ目の取得中にreloadする。
      act(() => {
        result.current.loadMore();
      });
      act(() => {
        result.current.reload();
      });

      // 取り直した1ページ目を先に返し、その後で古い2ページ目が届く。
      await act(async () => {
        resolvers[2]?.(createPage(['x'], null));
        await Promise.resolve();
      });
      await act(async () => {
        resolvers[1]?.(createPage(['b'], 'C2'));
        await Promise.resolve();
      });

      // 古い2ページ目は一覧にもカーソルにも反映しない。
      expect(result.current.items).toEqual(['x']);
      expect(result.current.hasMore).toBe(false);
      expect(cursors).toEqual([null, 'C1', null]);
    });

    it('reload前に始めた追加取得の失敗はエラー表示しない', async () => {
      const resolvers: ((page: CursorPage<string>) => void)[] = [];
      const rejecters: ((reason: Error) => void)[] = [];
      const fetchPage = vi.fn(
        () =>
          new Promise<CursorPage<string>>((resolve, reject) => {
            resolvers.push(resolve);
            rejecters.push(reject);
          }),
      );
      const { result } = renderHook(() => useCursorPagination(fetchPage));

      await act(async () => {
        resolvers[0]?.(createPage(['a'], 'C1'));
        await Promise.resolve();
      });
      act(() => {
        result.current.loadMore();
      });
      act(() => {
        result.current.reload();
      });
      await act(async () => {
        resolvers[2]?.(createPage(['x'], null));
        await Promise.resolve();
      });
      await act(async () => {
        rejecters[1]?.(new Error('古い取得の失敗'));
        await Promise.resolve();
      });

      expect(result.current.items).toEqual(['x']);
      expect(result.current.error).toBeNull();
    });

    it('reload後は新しいカーソルで追加取得できる', async () => {
      const { fetchPage, resolvers, cursors } = createDeferredFetch();
      const { result } = renderHook(() => useCursorPagination(fetchPage));

      await act(async () => {
        resolvers[0]?.(createPage(['a'], 'C1'));
        await Promise.resolve();
      });
      act(() => {
        result.current.loadMore();
      });
      act(() => {
        result.current.reload();
      });
      await act(async () => {
        resolvers[2]?.(createPage(['x'], 'C9'));
        await Promise.resolve();
      });

      // 古い取得が残っていても、取り直した後のカーソルから続けられる。
      act(() => {
        result.current.loadMore();
      });

      expect(cursors).toEqual([null, 'C1', null, 'C9']);
    });

    it('進行中の追加取得を打ち切る', async () => {
      const signals: (AbortSignal | undefined)[] = [];
      const fetchPage = vi.fn((cursor: string | null, signal?: AbortSignal) => {
        signals.push(signal);
        return cursor === null
          ? Promise.resolve(createPage(['a'], 'C1'))
          : new Promise<CursorPage<string>>(() => {});
      });
      const { result } = renderHook(() => useCursorPagination(fetchPage));

      await waitFor(() => {
        expect(result.current.hasMore).toBe(true);
      });
      act(() => {
        result.current.loadMore();
      });
      act(() => {
        result.current.reload();
      });

      expect(signals[1]?.aborted).toBe(true);
    });
  });
});
