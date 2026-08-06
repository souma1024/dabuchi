import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchFriends } from '../features/friends/api/friendsClient';
import { createFriend } from '../features/friends/testing/friendFactory';
import { RecipientSelectionRoute } from './RecipientSelectionRoute';

const navigateMock = vi.hoisted(() => vi.fn());
let searchParams = vi.hoisted(() => new URLSearchParams());

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
  useSearchParams: () => [searchParams],
}));

vi.mock('../features/friends/api/friendsClient', () => ({
  addFriend: vi.fn(),
  fetchFriends: vi.fn(),
}));

const mockedFetchFriends = vi.mocked(fetchFriends);

const taro = createFriend(1, {
  friend: {
    id: 'uuid-1',
    userId: 'friend-001',
    name: '山田 太郎',
    profileUrl: '/assets/profiles/human1.png',
  },
});
const hanako = createFriend(2, {
  friend: {
    id: 'uuid-2',
    userId: 'friend-002',
    name: '佐藤 花子',
    profileUrl: '/assets/profiles/human2.png',
  },
});

describe('RecipientSelectionRoute', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    searchParams = new URLSearchParams();
    mockedFetchFriends.mockReset();
    mockedFetchFriends.mockResolvedValue({
      friends: [],
      nextCursor: null,
    });
  });

  it('戻るは履歴を積まずホームへ戻る（replace: true。ブラウザ戻るで相手選択へ戻らない）', async () => {
    render(<RecipientSelectionRoute />);

    fireEvent.click(await screen.findByRole('button', { name: '戻る' }));

    expect(navigateMock).toHaveBeenCalledWith('/', { replace: true });
  });

  it('相手を選ぶと選択相手を載せて送金画面へ遷移する', async () => {
    mockedFetchFriends.mockResolvedValue({
      friends: [taro],
      nextCursor: null,
    });

    render(<RecipientSelectionRoute />);

    fireEvent.click(await screen.findByRole('button', { name: '山田 太郎' }));

    expect(navigateMock).toHaveBeenCalledWith('/transfer', {
      state: {
        recipient: {
          id: 'uuid-1',
          name: '山田 太郎',
          profileUrl: '/assets/profiles/human1.png',
        },
      },
    });
  });

  // 請求は複数人へまとめて出せる。選んでから「次へ」で確定し、配列で渡す。
  it('purpose=billingのときは選んだ相手全員を配列で請求画面へ渡す', async () => {
    searchParams = new URLSearchParams({ purpose: 'billing' });
    mockedFetchFriends.mockResolvedValue({
      friends: [taro, hanako],
      nextCursor: null,
    });

    render(<RecipientSelectionRoute />);

    expect(
      await screen.findByRole('heading', { name: '請求相手を選ぶ' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: '山田 太郎' }));
    fireEvent.click(screen.getByRole('checkbox', { name: '佐藤 花子' }));
    fireEvent.click(screen.getByRole('button', { name: '次へ' }));

    expect(navigateMock).toHaveBeenCalledWith('/billing', {
      state: {
        recipients: [
          {
            id: 'uuid-1',
            name: '山田 太郎',
            profileUrl: '/assets/profiles/human1.png',
          },
          {
            id: 'uuid-2',
            name: '佐藤 花子',
            profileUrl: '/assets/profiles/human2.png',
          },
        ],
      },
    });
  });

  it('purpose=billingで1人も選んでいない間は次へ進めない', async () => {
    searchParams = new URLSearchParams({ purpose: 'billing' });
    mockedFetchFriends.mockResolvedValue({
      friends: [taro],
      nextCursor: null,
    });

    render(<RecipientSelectionRoute />);

    expect(await screen.findByRole('button', { name: '次へ' })).toBeDisabled();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
