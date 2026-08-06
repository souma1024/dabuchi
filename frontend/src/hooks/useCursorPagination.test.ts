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
    expect(fetchPage).toHaveBeenLastCalledWith('1');
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
});
