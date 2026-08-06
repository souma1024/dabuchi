import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FriendPage } from '../api/friendsClient';
import {
  addFriend,
  blockFriend,
  fetchFriends,
  saveFriendshipNote,
} from '../api/friendsClient';
import { createFriend, createFriends } from '../testing/friendFactory';
import type { Friend } from '../types';
import { FriendsPage } from './FriendsPage';
import { installManualIntersectionObserver } from '../../../test/intersectionObserver';

vi.mock('../api/friendsClient', () => ({
  addFriend: vi.fn(),
  blockFriend: vi.fn(),
  fetchFriends: vi.fn(),
  saveFriendshipNote: vi.fn(),
  unblockFriend: vi.fn(),
}));

const mockedFetchFriends = vi.mocked(fetchFriends);
const mockedAddFriend = vi.mocked(addFriend);
const mockedBlockFriend = vi.mocked(blockFriend);
const mockedSaveNote = vi.mocked(saveFriendshipNote);

// 一覧末尾の監視は手で発火させる（jsdomにIntersectionObserverが無いため）。
const intersection = installManualIntersectionObserver();

function page(friends: Friend[], nextCursor: string | null = null): FriendPage {
  return { friends, nextCursor };
}

describe('FriendsPage', () => {
  beforeEach(() => {
    mockedFetchFriends.mockReset();
    mockedAddFriend.mockReset();
    mockedBlockFriend.mockReset();
    mockedSaveNote.mockReset();
    intersection.reset();
  });

  it('友達を氏名とユーザーIDで一覧表示する', async () => {
    mockedFetchFriends.mockResolvedValue(page(createFriends(2)));

    render(<FriendsPage />);

    expect(await screen.findByText('友達 1')).toBeInTheDocument();
    // 友達追加は公開user_idで行うため、一覧にもそれを出す。
    expect(screen.getByText('friend-001')).toBeInTheDocument();
    expect(screen.getByText('友達 2')).toBeInTheDocument();
  });

  it('友達がいない場合はメッセージを表示する', async () => {
    mockedFetchFriends.mockResolvedValue(page([]));

    render(<FriendsPage />);

    expect(await screen.findByText('まだ友達がいません')).toBeInTheDocument();
  });

  it('読み込み中はローディングを表示する', () => {
    mockedFetchFriends.mockReturnValue(new Promise<FriendPage>(() => {}));

    render(<FriendsPage />);

    expect(screen.getByText('読み込み中…')).toBeInTheDocument();
  });

  it('取得に失敗したらエラーを表示する', async () => {
    mockedFetchFriends.mockRejectedValue(new Error('友達の取得に失敗しました'));

    render(<FriendsPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '友達の取得に失敗しました',
    );
  });

  it('友達を追加したら一覧を取り直す', async () => {
    const added = createFriend(2);
    mockedFetchFriends
      .mockResolvedValueOnce(page(createFriends(1)))
      .mockResolvedValueOnce(page([...createFriends(1), added]));
    mockedAddFriend.mockResolvedValue(added);

    render(<FriendsPage />);
    await screen.findByText('友達 1');

    fireEvent.change(screen.getByLabelText('ユーザーID'), {
      target: { value: 'friend-002' },
    });
    fireEvent.click(screen.getByRole('button', { name: '追加' }));

    expect(await screen.findByText('友達 2')).toBeInTheDocument();
    expect(mockedAddFriend).toHaveBeenCalledWith('friend-002');
  });

  it('onBackを渡すと戻るボタンから通知する', async () => {
    mockedFetchFriends.mockResolvedValue(page(createFriends(1)));
    const onBack = vi.fn();

    render(<FriendsPage onBack={onBack} />);

    fireEvent.click(await screen.findByRole('button', { name: '戻る' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('ブロックリストボタンから親へ通知する', async () => {
    mockedFetchFriends.mockResolvedValue(page(createFriends(1)));
    const onOpenBlockedFriends = vi.fn();

    render(<FriendsPage onOpenBlockedFriends={onOpenBlockedFriends} />);

    fireEvent.click(
      await screen.findByRole('button', { name: 'ブロックリスト' }),
    );

    expect(onOpenBlockedFriends).toHaveBeenCalledTimes(1);
  });

  it('末尾に到達したら次のページを追加で読み込む', async () => {
    mockedFetchFriends
      .mockResolvedValueOnce(page(createFriends(20), 'next-cursor'))
      .mockResolvedValueOnce(page([createFriend(21)]));

    render(<FriendsPage />);
    await screen.findByText('友達 1');

    await intersection.trigger();

    await waitFor(() => {
      expect(mockedFetchFriends).toHaveBeenCalledTimes(2);
    });
    expect(mockedFetchFriends).toHaveBeenLastCalledWith(
      'next-cursor',
      expect.any(AbortSignal),
    );
  });

  // 3点リーダーから開く詳細に、追加時のメモとブロック操作を出す。
  describe('詳細フライアウト', () => {
    async function openDetail(friend: Friend) {
      mockedFetchFriends.mockResolvedValue(page([friend]));

      render(<FriendsPage />);

      fireEvent.click(
        await screen.findByRole('button', {
          name: `${friend.friend.name}の詳細`,
        }),
      );

      return screen.findByRole('region', {
        name: `${friend.friend.name}の詳細`,
      });
    }

    it('メモを表示する', async () => {
      await openDetail(createFriend(1, { note: '大学の友人' }));

      expect(await screen.findByText('大学の友人')).toBeInTheDocument();
    });

    it('メモが無ければその旨を表示する', async () => {
      await openDetail(createFriend(1, { note: null }));

      expect(await screen.findByText('メモはありません')).toBeInTheDocument();
    });

    it('ブロックすると行がブロック中に切り替わる', async () => {
      const friend = createFriend(1);
      mockedBlockFriend.mockResolvedValue(undefined);
      await openDetail(friend);

      fireEvent.click(
        await screen.findByRole('button', { name: 'ブロックする' }),
      );

      expect(await screen.findByText('ブロック中')).toBeInTheDocument();
      expect(mockedBlockFriend).toHaveBeenCalledWith(friend.friendshipId);
      // 続けて解除できるよう、詳細のボタンも入れ替わる。
      expect(
        screen.getByRole('button', { name: 'ブロックを解除する' }),
      ).toBeInTheDocument();
    });

    it('ブロックに失敗したら理由を表示し、ブロック中にしない', async () => {
      mockedBlockFriend.mockRejectedValue(
        new Error('ブロックに失敗しました (HTTP 500)'),
      );
      await openDetail(createFriend(1));

      fireEvent.click(
        await screen.findByRole('button', { name: 'ブロックする' }),
      );

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'ブロックに失敗しました (HTTP 500)',
      );
      expect(screen.queryByText('ブロック中')).not.toBeInTheDocument();
    });

    it('閉じるボタンで詳細を閉じる', async () => {
      const friend = createFriend(1);
      await openDetail(friend);

      fireEvent.click(await screen.findByRole('button', { name: '閉じる' }));

      await waitFor(() => {
        expect(
          screen.queryByRole('region', {
            name: `${friend.friend.name}の詳細`,
          }),
        ).not.toBeInTheDocument();
      });
    });

    it('何も変えずに閉じても一覧を取り直さない', async () => {
      await openDetail(createFriend(1));

      fireEvent.click(await screen.findByRole('button', { name: '閉じる' }));

      await waitFor(() => {
        expect(screen.queryByText('メモはありません')).not.toBeInTheDocument();
      });
      expect(mockedFetchFriends).toHaveBeenCalledTimes(1);
    });

    it('ブロックして閉じると一覧を取り直す', async () => {
      mockedBlockFriend.mockResolvedValue(undefined);
      await openDetail(createFriend(1));

      fireEvent.click(
        await screen.findByRole('button', { name: 'ブロックする' }),
      );
      await screen.findByText('ブロック中');
      fireEvent.click(screen.getByRole('button', { name: '閉じる' }));

      // ブロックした相手はAPIの一覧から外れるため、閉じた時点で取り直す。
      await waitFor(() => {
        expect(mockedFetchFriends).toHaveBeenCalledTimes(2);
      });
    });

    it('ペンからメモを書き換えて保存できる', async () => {
      const friend = createFriend(1, { note: '大学の友人' });
      mockedSaveNote.mockResolvedValue('ゼミの友人');
      await openDetail(friend);

      fireEvent.click(
        await screen.findByRole('button', { name: 'メモを編集' }),
      );
      fireEvent.change(screen.getByLabelText('メモ'), {
        target: { value: 'ゼミの友人' },
      });
      fireEvent.click(screen.getByRole('button', { name: '保存' }));

      // 既存メモがあるので更新として送る。
      await waitFor(() => {
        expect(mockedSaveNote).toHaveBeenCalledWith(
          friend.friendshipId,
          'ゼミの友人',
          true,
        );
      });
      expect(await screen.findByText('ゼミの友人')).toBeInTheDocument();
    });

    it('メモが無ければ新規作成として送る', async () => {
      const friend = createFriend(1, { note: null });
      mockedSaveNote.mockResolvedValue('大学の友人');
      await openDetail(friend);

      fireEvent.click(
        await screen.findByRole('button', { name: 'メモを編集' }),
      );
      fireEvent.change(screen.getByLabelText('メモ'), {
        target: { value: '大学の友人' },
      });
      fireEvent.click(screen.getByRole('button', { name: '保存' }));

      await waitFor(() => {
        expect(mockedSaveNote).toHaveBeenCalledWith(
          friend.friendshipId,
          '大学の友人',
          false,
        );
      });
    });

    it('メモの保存に失敗したら理由を表示する', async () => {
      mockedSaveNote.mockRejectedValue(
        new Error('メモの保存に失敗しました (HTTP 500)'),
      );
      await openDetail(createFriend(1, { note: '大学の友人' }));

      fireEvent.click(
        await screen.findByRole('button', { name: 'メモを編集' }),
      );
      fireEvent.click(screen.getByRole('button', { name: '保存' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'メモの保存に失敗しました (HTTP 500)',
      );
    });
  });
});
