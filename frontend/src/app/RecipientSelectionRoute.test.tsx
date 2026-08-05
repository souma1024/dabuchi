import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchRecipients } from '../features/recipientSelection/api/fetchRecipients';
import type { Recipient } from '../features/recipientSelection/types';
import { RecipientSelectionRoute } from './RecipientSelectionRoute';

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('../features/recipientSelection/api/fetchRecipients', () => ({
  fetchRecipients: vi.fn(),
}));

const mockedFetchRecipients = vi.mocked(fetchRecipients);

describe('RecipientSelectionRoute', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    mockedFetchRecipients.mockReset();
    mockedFetchRecipients.mockResolvedValue({
      recipients: [],
      nextCursor: null,
    });
  });

  it('戻るは履歴を積まずホームへ戻る（replace: true。ブラウザ戻るで相手選択へ戻らない）', async () => {
    render(<RecipientSelectionRoute />);

    fireEvent.click(await screen.findByRole('button', { name: '戻る' }));

    expect(navigateMock).toHaveBeenCalledWith('/', { replace: true });
  });

  it('相手を選ぶと選択相手を載せて送金画面へ遷移する', async () => {
    const recipient: Recipient = {
      id: 'uuid-1',
      name: '山田 太郎',
      imageUrl: '/assets/profiles/human1.png',
    };
    mockedFetchRecipients.mockResolvedValue({
      recipients: [recipient],
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
});
