import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchRecipients } from './api/fetchRecipients';
import { RecipientSelectionScreen } from './RecipientSelectionScreen';
import type { Recipient } from './types';

vi.mock('./api/fetchRecipients', () => ({
  fetchRecipients: vi.fn(),
}));

const mockedFetchRecipients = vi.mocked(fetchRecipients);

const sampleRecipients: Recipient[] = [
  {
    id: 'friend-001',
    name: '山田 太郎',
    imageUrl: '/assets/profiles/human1.png',
  },
  {
    id: 'friend-002',
    name: '佐藤 花子',
    imageUrl: '/assets/profiles/human2.png',
  },
];

describe('RecipientSelectionScreen', () => {
  beforeEach(() => {
    mockedFetchRecipients.mockReset();
  });

  it('取得したユーザーを一覧表示する', async () => {
    mockedFetchRecipients.mockResolvedValue(sampleRecipients);

    render(
      <RecipientSelectionScreen
        currentUserId="me"
        onSelectRecipient={vi.fn()}
      />,
    );

    expect(
      await screen.findByRole('button', { name: '山田 太郎' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '佐藤 花子' }),
    ).toBeInTheDocument();
  });

  it('行をタップすると選んだ相手を親へ通知する', async () => {
    mockedFetchRecipients.mockResolvedValue(sampleRecipients);
    const onSelectRecipient = vi.fn();

    render(
      <RecipientSelectionScreen
        currentUserId="me"
        onSelectRecipient={onSelectRecipient}
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: '山田 太郎' }));

    expect(onSelectRecipient).toHaveBeenCalledWith(sampleRecipients[0]);
  });

  it('取得に失敗したらエラーを表示する', async () => {
    mockedFetchRecipients.mockRejectedValue(
      new Error('送金相手の取得に失敗しました'),
    );

    render(
      <RecipientSelectionScreen
        currentUserId="me"
        onSelectRecipient={vi.fn()}
      />,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '送金相手の取得に失敗しました',
    );
  });
});
