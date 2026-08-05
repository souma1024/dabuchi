import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RecipientPage } from './api/fetchRecipients';
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

function page(recipients: Recipient[]): RecipientPage {
  return { recipients, nextCursor: null };
}

describe('RecipientSelectionScreen', () => {
  beforeEach(() => {
    mockedFetchRecipients.mockReset();
  });

  it('取得したユーザーを一覧表示する', async () => {
    mockedFetchRecipients.mockResolvedValue(page(sampleRecipients));

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

  it('読み込み中はローディングを表示する', () => {
    mockedFetchRecipients.mockReturnValue(new Promise<RecipientPage>(() => {}));

    render(
      <RecipientSelectionScreen
        currentUserId="me"
        onSelectRecipient={vi.fn()}
      />,
    );

    expect(screen.getByText('読み込み中…')).toBeInTheDocument();
  });

  it('相手がいない場合はメッセージを表示する', async () => {
    mockedFetchRecipients.mockResolvedValue(page([]));

    render(
      <RecipientSelectionScreen
        currentUserId="me"
        onSelectRecipient={vi.fn()}
      />,
    );

    expect(
      await screen.findByText('送金できる相手がいません。'),
    ).toBeInTheDocument();
  });

  it('行をタップすると選んだ相手を親へ通知する', async () => {
    mockedFetchRecipients.mockResolvedValue(page(sampleRecipients));
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
