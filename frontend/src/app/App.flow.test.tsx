import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchRecipients } from '../features/recipientSelection/api/fetchRecipients';
import { App } from './App';

vi.mock('../features/recipientSelection/api/fetchRecipients', () => ({
  fetchRecipients: vi.fn(),
}));

const mockedFetchRecipients = vi.mocked(fetchRecipients);

describe('送金フローの結合', () => {
  beforeEach(() => {
    mockedFetchRecipients.mockReset();
    mockedFetchRecipients.mockResolvedValue({
      recipients: [
        {
          id: 'uuid-1',
          name: '山田 太郎',
          imageUrl: '/assets/profiles/human1.png',
        },
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

  it('ホーム→相手選択（請求）→相手タップで、請求画面へ選んだ相手が渡る', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('link', { name: '請求する' }));

    expect(
      await screen.findByRole('heading', { name: '請求相手を選ぶ' }),
    ).toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: '山田 太郎' }));

    expect(
      await screen.findByRole('heading', { name: '請求先' }),
    ).toBeInTheDocument();
    expect(screen.getByText('山田 太郎')).toBeInTheDocument();
  });
});
