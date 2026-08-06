import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchCurrentUser } from '../features/currentUser/api/fetchCurrentUser';
import { fetchTransactions } from '../features/transactions/api/transactionsClient';
import { App } from './App';

vi.mock('../features/currentUser/api/fetchCurrentUser', () => ({
  fetchCurrentUser: vi.fn(),
}));

vi.mock('../features/transactions/api/transactionsClient', () => ({
  fetchTransactions: vi.fn(),
}));

const mockedFetchCurrentUser = vi.mocked(fetchCurrentUser);
const mockedFetchTransactions = vi.mocked(fetchTransactions);

describe('取引履歴への導線', () => {
  beforeEach(() => {
    mockedFetchCurrentUser.mockReset();
    mockedFetchCurrentUser.mockResolvedValue({
      id: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001',
      userId: 'friend-001',
      name: '山田 太郎',
      profileUrl: '/assets/profiles/human1.png',
      balance: 120000,
    });

    mockedFetchTransactions.mockReset();
    mockedFetchTransactions.mockResolvedValue({
      transactions: [
        {
          id: '1024',
          counterparty: {
            id: '0198fb84-b222-7abc-8def-0123456789ab',
            name: '佐藤 花子',
            profileUrl: '/assets/profiles/human2.png',
          },
          amount: 1200,
          direction: 'sent',
          createdAt: '2026-08-05T01:00:00.000Z',
        },
      ],
      nextCursor: null,
    });

    window.history.pushState({}, '', '/');
  });

  it('ホームの「履歴一覧」から取引履歴を表示し、戻るでホームへ帰る', async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole('link', { name: '履歴一覧' }));

    expect(
      await screen.findByRole('heading', { name: '取引履歴' }),
    ).toBeInTheDocument();
    // 対象ユーザーはserver側で決まるため、フロントはカーソルだけを渡す。
    expect(mockedFetchTransactions).toHaveBeenCalledWith(null);
    expect(await screen.findByText('佐藤 花子')).toBeInTheDocument();
    expect(screen.getByText('1,200円')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '戻る' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'dabuchi' }),
    ).toBeInTheDocument();
  });
});
