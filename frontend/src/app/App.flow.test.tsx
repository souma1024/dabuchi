import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchFriends } from '../features/friends/api/friendsClient';
import { createFriend } from '../features/friends/testing/friendFactory';
import { App } from './App';

vi.mock('../features/friends/api/friendsClient', () => ({
  addFriend: vi.fn(),
  fetchFriends: vi.fn(),
}));

const mockedFetchFriends = vi.mocked(fetchFriends);

describe('送金フローの結合', () => {
  beforeEach(() => {
    mockedFetchFriends.mockReset();
    mockedFetchFriends.mockResolvedValue({
      friends: [
        createFriend(1, {
          friend: {
            id: 'uuid-1',
            userId: 'friend-001',
            name: '山田 太郎',
            profileUrl: '/assets/profiles/human1.png',
          },
        }),
        createFriend(2, {
          friend: {
            id: 'uuid-2',
            userId: 'friend-002',
            name: '佐藤 花子',
            profileUrl: '/assets/profiles/human2.png',
          },
        }),
      ],
      nextCursor: null,
    });
    window.history.pushState({}, '', '/');
  });

  it('ホーム→相手選択→相手タップで、送金画面へ選んだ相手が渡る', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('link', { name: '送金する' }));

    fireEvent.click(await screen.findByRole('button', { name: '山田 太郎' }));

    expect(
      await screen.findByRole('heading', { name: '送金先' }),
    ).toBeInTheDocument();
    expect(screen.getByText('山田 太郎')).toBeInTheDocument();
  });

  // 請求は複数人を選んでから「次へ」で確定する。選んだ全員が請求画面へ並ぶ。
  it('ホーム→相手選択（請求）→複数チェック→次へで、請求画面へ選んだ相手全員が渡る', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('link', { name: '請求する' }));

    expect(
      await screen.findByRole('heading', { name: '請求相手を選ぶ' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: '山田 太郎' }));
    fireEvent.click(screen.getByRole('checkbox', { name: '佐藤 花子' }));
    fireEvent.click(screen.getByRole('button', { name: '次へ' }));

    expect(
      await screen.findByRole('heading', { name: '請求先（2人）' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('山田 太郎')).toBeInTheDocument();
    expect(screen.getByLabelText('佐藤 花子')).toBeInTheDocument();
  });
});
