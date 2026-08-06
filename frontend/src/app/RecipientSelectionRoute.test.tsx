import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchRecipients } from '../features/recipientSelection/api/fetchRecipients';
import type { Recipient } from '../features/recipientSelection/types';
import { RecipientSelectionRoute } from './RecipientSelectionRoute';

const navigateMock = vi.hoisted(() => vi.fn());
let searchParams = vi.hoisted(() => new URLSearchParams());

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
  useSearchParams: () => [searchParams],
}));

vi.mock('../features/recipientSelection/api/fetchRecipients', () => ({
  fetchRecipients: vi.fn(),
}));

const mockedFetchRecipients = vi.mocked(fetchRecipients);

const taro: Recipient = {
  id: 'uuid-1',
  name: '山田 太郎',
  imageUrl: '/assets/profiles/human1.png',
};
const hanako: Recipient = {
  id: 'uuid-2',
  name: '佐藤 花子',
  imageUrl: '/assets/profiles/human2.png',
};

describe('RecipientSelectionRoute', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    searchParams = new URLSearchParams();
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

  it('初期表示はcreated-ascで取得し、並び替え変更時に再取得する', async () => {
    mockedFetchRecipients
      .mockResolvedValueOnce({
        recipients: [taro],
        nextCursor: null,
      })
      .mockResolvedValueOnce({
        recipients: [hanako],
        nextCursor: null,
      });

    render(<RecipientSelectionRoute />);

    expect(
      await screen.findByRole('button', { name: '山田 太郎' }),
    ).toBeInTheDocument();
    expect(mockedFetchRecipients).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      null,
      'created-asc',
    );

    fireEvent.change(screen.getByRole('combobox', { name: '並び替え' }), {
      target: { value: 'created-desc' },
    });

    expect(
      await screen.findByRole('button', { name: '佐藤 花子' }),
    ).toBeInTheDocument();
    expect(mockedFetchRecipients).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      null,
      'created-desc',
    );
  });

  it('相手を選ぶと選択相手を載せて送金画面へ遷移する', async () => {
    mockedFetchRecipients.mockResolvedValue({
      recipients: [taro],
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
    mockedFetchRecipients.mockResolvedValue({
      recipients: [taro, hanako],
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
    mockedFetchRecipients.mockResolvedValue({
      recipients: [taro],
      nextCursor: null,
    });

    render(<RecipientSelectionRoute />);

    expect(await screen.findByRole('button', { name: '次へ' })).toBeDisabled();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
