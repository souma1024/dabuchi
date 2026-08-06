import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BlockedFriendPage } from '../api/friendsClient';
import { fetchBlockedFriends, unblockFriend } from '../api/friendsClient';
import { createBlockedFriend } from '../testing/friendFactory';
import type { BlockedFriend } from '../types';
import { BlockedFriendsPage } from './BlockedFriendsPage';

vi.mock('../api/friendsClient', () => ({
  blockFriend: vi.fn(),
  fetchBlockedFriends: vi.fn(),
  saveFriendshipNote: vi.fn(),
  unblockFriend: vi.fn(),
}));

const mockedFetchBlockedFriends = vi.mocked(fetchBlockedFriends);
const mockedUnblockFriend = vi.mocked(unblockFriend);

function page(
  friends: BlockedFriend[],
  nextCursor: string | null = null,
): BlockedFriendPage {
  return { friends, nextCursor };
}

describe('BlockedFriendsPage', () => {
  beforeEach(() => {
    mockedFetchBlockedFriends.mockReset();
    mockedUnblockFriend.mockReset();
  });

  it('ブロック中の友達を一覧表示する', async () => {
    mockedFetchBlockedFriends.mockResolvedValue(
      page([createBlockedFriend(1), createBlockedFriend(2)]),
    );

    render(<BlockedFriendsPage />);

    expect(await screen.findByText('友達 1')).toBeInTheDocument();
    expect(screen.getByText('友達 2')).toBeInTheDocument();
    // 取得できた相手は全員ブロック中。
    expect(screen.getAllByText('ブロック中')).toHaveLength(2);
  });

  it('ブロック中の友達がいない場合はメッセージを表示する', async () => {
    mockedFetchBlockedFriends.mockResolvedValue(page([]));

    render(<BlockedFriendsPage />);

    expect(
      await screen.findByText('ブロック中の友達はいません'),
    ).toBeInTheDocument();
  });

  it('取得に失敗したらエラーを表示する', async () => {
    mockedFetchBlockedFriends.mockRejectedValue(
      new Error('ブロックリストの取得に失敗しました (HTTP 500)'),
    );

    render(<BlockedFriendsPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'ブロックリストの取得に失敗しました (HTTP 500)',
    );
  });

  it('詳細から解除するとブロック中の表示が外れる', async () => {
    const friend = createBlockedFriend(1);
    mockedFetchBlockedFriends.mockResolvedValue(page([friend]));
    mockedUnblockFriend.mockResolvedValue(undefined);

    render(<BlockedFriendsPage />);

    fireEvent.click(
      await screen.findByRole('button', { name: '友達 1の詳細' }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'ブロックを解除する' }),
    );

    await waitFor(() => {
      expect(screen.queryByText('ブロック中')).not.toBeInTheDocument();
    });
    expect(mockedUnblockFriend).toHaveBeenCalledWith(friend.friendshipId);
    // 解除しても行は残るので、その場で戻せる。
    expect(
      screen.getByRole('button', { name: 'ブロックする' }),
    ).toBeInTheDocument();
  });

  it('解除して閉じると一覧を取り直す', async () => {
    mockedFetchBlockedFriends
      .mockResolvedValueOnce(page([createBlockedFriend(1)]))
      .mockResolvedValueOnce(page([]));
    mockedUnblockFriend.mockResolvedValue(undefined);

    render(<BlockedFriendsPage />);

    fireEvent.click(
      await screen.findByRole('button', { name: '友達 1の詳細' }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'ブロックを解除する' }),
    );
    await waitFor(() => {
      expect(mockedUnblockFriend).toHaveBeenCalledOnce();
    });
    fireEvent.click(screen.getByRole('button', { name: '閉じる' }));

    // 解除した相手はAPIの一覧から外れるため、閉じた時点で取り直す。
    await waitFor(() => {
      expect(mockedFetchBlockedFriends).toHaveBeenCalledTimes(2);
    });
    expect(
      await screen.findByText('ブロック中の友達はいません'),
    ).toBeInTheDocument();
  });

  it('onBackを渡すと戻るボタンから通知する', async () => {
    mockedFetchBlockedFriends.mockResolvedValue(page([createBlockedFriend(1)]));
    const onBack = vi.fn();

    render(<BlockedFriendsPage onBack={onBack} />);

    fireEvent.click(await screen.findByRole('button', { name: '戻る' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
