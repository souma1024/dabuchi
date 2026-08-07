import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FriendPage } from '../friends/api/friendsClient';
import { addFriend, fetchFriends } from '../friends/api/friendsClient';
import { createFriend } from '../friends/testing/friendFactory';
import type { Friend } from '../friends/types';
import { RecipientSelectionScreen } from './RecipientSelectionScreen';
import type { Recipient } from './types';

vi.mock('../friends/api/friendsClient', () => ({
  addFriend: vi.fn(),
  fetchFriends: vi.fn(),
}));

const mockedFetchFriends = vi.mocked(fetchFriends);
const mockedAddFriend = vi.mocked(addFriend);

const sampleFriends: Friend[] = [
  createFriend(1, {
    friend: {
      id: 'user-1',
      userId: 'friend-001',
      name: '山田 太郎',
      profileUrl: '/assets/profiles/human1.png',
    },
  }),
  createFriend(2, {
    friend: {
      id: 'user-2',
      userId: 'friend-002',
      name: '佐藤 花子',
      profileUrl: '/assets/profiles/human2.png',
    },
  }),
];

// 一覧は友達のプロフィールを表示形へ変換して並べる。
const sampleRecipients: Recipient[] = sampleFriends.map(({ friend }) => ({
  id: friend.id,
  name: friend.name,
  imageUrl: friend.profileUrl,
}));

function page(friends: Friend[]): FriendPage {
  return { friends, nextCursor: null };
}

describe('RecipientSelectionScreen', () => {
  beforeEach(() => {
    mockedFetchFriends.mockReset();
    mockedAddFriend.mockReset();
  });

  it('取得したユーザーを一覧表示する', async () => {
    mockedFetchFriends.mockResolvedValue(page(sampleFriends));

    render(<RecipientSelectionScreen onSelectRecipient={vi.fn()} />);

    expect(
      await screen.findByRole('button', { name: '山田 太郎' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '佐藤 花子' }),
    ).toBeInTheDocument();
    expect(mockedFetchFriends).toHaveBeenCalledWith(
      null,
      'created-asc',
      undefined,
    );
  });

  it('読み込み中はローディングを表示する', () => {
    mockedFetchFriends.mockReturnValue(new Promise<FriendPage>(() => {}));

    render(<RecipientSelectionScreen onSelectRecipient={vi.fn()} />);

    expect(screen.getByText('読み込み中…')).toBeInTheDocument();
  });

  it('相手がいない場合はメッセージを表示する', async () => {
    mockedFetchFriends.mockResolvedValue(page([]));

    render(<RecipientSelectionScreen onSelectRecipient={vi.fn()} />);

    expect(
      await screen.findByText('送金できる相手がいません。'),
    ).toBeInTheDocument();
  });

  it('行をタップすると選んだ相手を親へ通知する', async () => {
    mockedFetchFriends.mockResolvedValue(page(sampleFriends));
    const onSelectRecipient = vi.fn();

    render(<RecipientSelectionScreen onSelectRecipient={onSelectRecipient} />);

    fireEvent.click(await screen.findByRole('button', { name: '山田 太郎' }));

    expect(onSelectRecipient).toHaveBeenCalledWith(sampleRecipients[0]);
  });

  it('取得に失敗したらエラーを表示する', async () => {
    mockedFetchFriends.mockRejectedValue(
      new Error('送金相手の取得に失敗しました'),
    );

    render(<RecipientSelectionScreen onSelectRecipient={vi.fn()} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '送金相手の取得に失敗しました',
    );
  });

  it('並び順を切り替えると先頭から取り直す', async () => {
    mockedFetchFriends
      .mockResolvedValueOnce(page(sampleFriends))
      .mockResolvedValueOnce(
        page([
          createFriend(10, {
            friend: {
              id: 'user-10',
              userId: 'friend-010',
              name: '友達 10',
              profileUrl: '/assets/profiles/human4.png',
            },
          }),
        ]),
      );

    render(<RecipientSelectionScreen onSelectRecipient={vi.fn()} />);
    expect(
      await screen.findByRole('button', { name: '山田 太郎' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '新しい順' }));

    expect(
      await screen.findByRole('button', { name: '友達 10' }),
    ).toBeInTheDocument();
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

  // 送金・請求どちらの候補一覧からも、その場で友達を追加できる。
  describe('友達追加', () => {
    it('追加に成功したら一覧を取り直す', async () => {
      const added = createFriend(3, {
        friend: {
          id: 'user-3',
          userId: 'friend-003',
          name: '鈴木 一郎',
          profileUrl: '/assets/profiles/human3.png',
        },
      });
      mockedFetchFriends
        .mockResolvedValueOnce(page(sampleFriends))
        .mockResolvedValueOnce(page([...sampleFriends, added]));
      mockedAddFriend.mockResolvedValue(added);

      render(<RecipientSelectionScreen onSelectRecipient={vi.fn()} />);
      await screen.findByRole('button', { name: '山田 太郎' });

      fireEvent.change(screen.getByLabelText('ユーザーID'), {
        target: { value: 'friend-003' },
      });
      fireEvent.click(screen.getByRole('button', { name: '追加' }));

      expect(
        await screen.findByRole('button', { name: '鈴木 一郎' }),
      ).toBeInTheDocument();
      expect(mockedAddFriend).toHaveBeenCalledWith('friend-003');
      expect(await screen.findByRole('status')).toHaveTextContent(
        '鈴木 一郎を友達に追加しました',
      );
    });

    it('追加に失敗したら理由を表示し、一覧は取り直さない', async () => {
      mockedFetchFriends.mockResolvedValue(page(sampleFriends));
      mockedAddFriend.mockRejectedValue(new Error('すでに友達です'));

      render(<RecipientSelectionScreen onSelectRecipient={vi.fn()} />);
      await screen.findByRole('button', { name: '山田 太郎' });

      fireEvent.change(screen.getByLabelText('ユーザーID'), {
        target: { value: 'friend-002' },
      });
      fireEvent.click(screen.getByRole('button', { name: '追加' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'すでに友達です',
      );
      expect(mockedFetchFriends).toHaveBeenCalledTimes(1);
    });

    it('ユーザーID未入力では追加できない', async () => {
      mockedFetchFriends.mockResolvedValue(page(sampleFriends));

      render(<RecipientSelectionScreen onSelectRecipient={vi.fn()} />);
      await screen.findByRole('button', { name: '山田 太郎' });

      expect(screen.getByRole('button', { name: '追加' })).toBeDisabled();
      expect(mockedAddFriend).not.toHaveBeenCalled();
    });
  });

  // 請求は複数人へまとめて出せるため、選んでから「次へ」で確定する。
  describe('複数選択モード', () => {
    function renderMultiple(
      onConfirmSelection = vi.fn(),
      maxSelectionCount?: number,
    ) {
      render(
        <RecipientSelectionScreen
          selectionMode="multiple"
          onConfirmSelection={onConfirmSelection}
          maxSelectionCount={maxSelectionCount}
        />,
      );
      return onConfirmSelection;
    }

    it('各行をチェックボックスとして表示する', async () => {
      mockedFetchFriends.mockResolvedValue(page(sampleFriends));
      renderMultiple();

      expect(
        await screen.findByRole('checkbox', { name: '山田 太郎' }),
      ).not.toBeChecked();
      expect(
        screen.getByRole('checkbox', { name: '佐藤 花子' }),
      ).toBeInTheDocument();
      // 行タップで即確定する単一選択のボタンは出さない。
      expect(
        screen.queryByRole('button', { name: '山田 太郎' }),
      ).not.toBeInTheDocument();
    });

    it('1人も選んでいない間は次へ進めない', async () => {
      mockedFetchFriends.mockResolvedValue(page(sampleFriends));
      const onConfirmSelection = renderMultiple();

      expect(
        await screen.findByRole('button', { name: '次へ' }),
      ).toBeDisabled();
      expect(onConfirmSelection).not.toHaveBeenCalled();
    });

    it('選んだ相手を選択順で親へ渡す', async () => {
      mockedFetchFriends.mockResolvedValue(page(sampleFriends));
      const onConfirmSelection = renderMultiple();

      fireEvent.click(
        await screen.findByRole('checkbox', { name: '佐藤 花子' }),
      );
      fireEvent.click(screen.getByRole('checkbox', { name: '山田 太郎' }));
      fireEvent.click(screen.getByRole('button', { name: '次へ' }));

      expect(onConfirmSelection).toHaveBeenCalledWith([
        sampleRecipients[1],
        sampleRecipients[0],
      ]);
    });

    it('選択を外すと渡す相手から除かれる', async () => {
      mockedFetchFriends.mockResolvedValue(page(sampleFriends));
      const onConfirmSelection = renderMultiple();

      const taro = await screen.findByRole('checkbox', { name: '山田 太郎' });
      fireEvent.click(taro);
      fireEvent.click(screen.getByRole('checkbox', { name: '佐藤 花子' }));
      fireEvent.click(taro);
      fireEvent.click(screen.getByRole('button', { name: '次へ' }));

      expect(onConfirmSelection).toHaveBeenCalledWith([sampleRecipients[1]]);
    });

    it('選択中の人数を表示する', async () => {
      mockedFetchFriends.mockResolvedValue(page(sampleFriends));
      renderMultiple();

      expect(await screen.findByText('選択中 0人')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('checkbox', { name: '山田 太郎' }));

      expect(screen.getByText('選択中 1人')).toBeInTheDocument();
    });

    // backendは1リクエスト50件までしか受け付けないため、選択の時点で止める。
    it('上限に達したら未選択の相手を選べなくする', async () => {
      mockedFetchFriends.mockResolvedValue(page(sampleFriends));
      renderMultiple(vi.fn(), 1);

      fireEvent.click(
        await screen.findByRole('checkbox', { name: '山田 太郎' }),
      );

      expect(
        screen.getByRole('checkbox', { name: '佐藤 花子' }),
      ).toBeDisabled();
      expect(screen.getByRole('checkbox', { name: '山田 太郎' })).toBeEnabled();
      expect(
        screen.getByText('一度に選べるのは1人までです'),
      ).toBeInTheDocument();
    });
  });
});
