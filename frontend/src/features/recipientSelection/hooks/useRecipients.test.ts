import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FriendPage } from '../../friends/api/friendsClient';
import { fetchFriends } from '../../friends/api/friendsClient';
import { createFriend } from '../../friends/testing/friendFactory';
import { useRecipients } from './useRecipients';

vi.mock('../../friends/api/friendsClient', () => ({
  fetchFriends: vi.fn(),
}));

const mockedFetchFriends = vi.mocked(fetchFriends);

const page1: FriendPage = {
  friends: [createFriend(1)],
  nextCursor: 'C1',
};
const page2: FriendPage = {
  friends: [createFriend(2)],
  nextCursor: null,
};

describe('useRecipients', () => {
  beforeEach(() => {
    mockedFetchFriends.mockReset();
  });

  it('初回に1ページ目を読み込み、次があればhasMoreを立てる', async () => {
    mockedFetchFriends.mockResolvedValueOnce(page1);

    const { result } = renderHook(() => useRecipients());

    await waitFor(() => {
      expect(result.current.isLoadingInitial).toBe(false);
    });
    // 友達のプロフィールを一覧の表示形へ変換して返す。
    expect(result.current.recipients).toEqual([
      { id: 'user-1', name: '友達 1', imageUrl: '/assets/profiles/human1.png' },
    ]);
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

    const { result } = renderHook(() => useRecipients());
    await waitFor(() => {
      expect(result.current.isLoadingInitial).toBe(false);
    });

    act(() => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.recipients).toHaveLength(2);
    });
    expect(result.current.recipients.map((recipient) => recipient.id)).toEqual([
      'user-1',
      'user-2',
    ]);
    expect(result.current.hasMore).toBe(false);
    expect(mockedFetchFriends).toHaveBeenLastCalledWith(
      'C1',
      'created-asc',
      expect.any(AbortSignal),
    );
  });

  it('reloadで1ページ目から取り直す', async () => {
    mockedFetchFriends
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce(page2)
      .mockResolvedValueOnce({ friends: [createFriend(3)], nextCursor: null });

    const { result } = renderHook(() => useRecipients());
    await waitFor(() => {
      expect(result.current.isLoadingInitial).toBe(false);
    });

    act(() => {
      result.current.loadMore();
    });
    await waitFor(() => {
      expect(result.current.recipients).toHaveLength(2);
    });

    act(() => {
      result.current.reload();
    });

    await waitFor(() => {
      expect(result.current.recipients).toEqual([
        {
          id: 'user-3',
          name: '友達 3',
          imageUrl: '/assets/profiles/human3.png',
        },
      ]);
    });
    // 追加済みのカーソルを引きずらず、1ページ目から取り直す。
    expect(mockedFetchFriends).toHaveBeenLastCalledWith(
      null,
      'created-asc',
      undefined,
    );
  });

  it('取得に失敗したらerrorを設定する', async () => {
    mockedFetchFriends.mockRejectedValueOnce(new Error('取得失敗'));

    const { result } = renderHook(() => useRecipients());

    await waitFor(() => {
      expect(result.current.error).toBe('取得失敗');
    });
    expect(result.current.isLoadingInitial).toBe(false);
  });
});
