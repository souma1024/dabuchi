import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FriendPage } from '../api/friendsClient';
import { fetchFriends } from '../api/friendsClient';
import { createFriend } from '../testing/friendFactory';
import type { FriendSort } from '../types';
import { useFriends } from './useFriends';

vi.mock('../api/friendsClient', () => ({
  fetchFriends: vi.fn(),
}));

const mockedFetchFriends = vi.mocked(fetchFriends);

const page1: FriendPage = { friends: [createFriend(1)], nextCursor: 'C1' };
const page2: FriendPage = { friends: [createFriend(2)], nextCursor: null };

describe('useFriends', () => {
  beforeEach(() => {
    mockedFetchFriends.mockReset();
  });

  it('初回に1ページ目を読み込み、次があればhasMoreを立てる', async () => {
    mockedFetchFriends.mockResolvedValueOnce(page1);

    const { result } = renderHook(() => useFriends());

    await waitFor(() => {
      expect(result.current.isLoadingInitial).toBe(false);
    });
    expect(result.current.friends).toEqual(page1.friends);
    expect(result.current.hasMore).toBe(true);
    // clientはユーザーを指定しない（server側のログイン中ユーザーで決まる）。
    expect(mockedFetchFriends).toHaveBeenCalledWith(
      null,
      'created-asc',
      undefined,
    );
  });

  it('loadMoreで次ページを追記し、最終ページでhasMoreがfalseになる', async () => {
    mockedFetchFriends
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce(page2);

    const { result } = renderHook(() => useFriends());
    await waitFor(() => {
      expect(result.current.isLoadingInitial).toBe(false);
    });

    act(() => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.friends).toHaveLength(2);
    });
    expect(result.current.hasMore).toBe(false);
    expect(mockedFetchFriends).toHaveBeenLastCalledWith(
      'C1',
      'created-asc',
      expect.any(AbortSignal),
    );
  });

  it('最終ページではloadMoreで再取得しない', async () => {
    mockedFetchFriends.mockResolvedValueOnce(page2);

    const { result } = renderHook(() => useFriends());
    await waitFor(() => {
      expect(result.current.isLoadingInitial).toBe(false);
    });

    act(() => {
      result.current.loadMore();
    });

    expect(mockedFetchFriends).toHaveBeenCalledTimes(1);
  });

  it('reloadで1ページ目から取り直す', async () => {
    mockedFetchFriends
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce(page2)
      .mockResolvedValueOnce({ friends: [createFriend(3)], nextCursor: null });

    const { result } = renderHook(() => useFriends());
    await waitFor(() => {
      expect(result.current.isLoadingInitial).toBe(false);
    });

    act(() => {
      result.current.loadMore();
    });
    await waitFor(() => {
      expect(result.current.friends).toHaveLength(2);
    });

    act(() => {
      result.current.reload();
    });

    await waitFor(() => {
      expect(result.current.friends).toEqual([createFriend(3)]);
    });
    // 追加済みのカーソルを引きずらず、1ページ目から取り直す。
    expect(mockedFetchFriends).toHaveBeenLastCalledWith(
      null,
      'created-asc',
      undefined,
    );
  });

  it('sortが変わると1ページ目から取り直す', async () => {
    mockedFetchFriends
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce({ friends: [createFriend(3)], nextCursor: null });

    const { result, rerender } = renderHook(
      ({ sort }: { sort: FriendSort }) => useFriends(sort),
      { initialProps: { sort: 'created-asc' as FriendSort } },
    );
    await waitFor(() => {
      expect(result.current.isLoadingInitial).toBe(false);
    });

    rerender({ sort: 'created-desc' as FriendSort });

    await waitFor(() => {
      expect(result.current.friends).toEqual([createFriend(3)]);
    });
    expect(mockedFetchFriends).toHaveBeenNthCalledWith(
      1,
      null,
      'created-asc',
      undefined,
    );
    expect(mockedFetchFriends).toHaveBeenNthCalledWith(
      2,
      null,
      'created-desc',
      undefined,
    );
  });

  it('取得に失敗したらerrorを設定する', async () => {
    mockedFetchFriends.mockRejectedValueOnce(new Error('取得失敗'));

    const { result } = renderHook(() => useFriends());

    await waitFor(() => {
      expect(result.current.error).toBe('取得失敗');
    });
    expect(result.current.isLoadingInitial).toBe(false);
  });
});
