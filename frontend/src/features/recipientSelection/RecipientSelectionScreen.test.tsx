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

  // 請求は複数人へまとめて出せるため、選んでから「次へ」で確定する。
  describe('複数選択モード', () => {
    function renderMultiple(
      onConfirmSelection = vi.fn(),
      maxSelectionCount?: number,
    ) {
      render(
        <RecipientSelectionScreen
          currentUserId="me"
          selectionMode="multiple"
          onConfirmSelection={onConfirmSelection}
          maxSelectionCount={maxSelectionCount}
        />,
      );
      return onConfirmSelection;
    }

    it('各行をチェックボックスとして表示する', async () => {
      mockedFetchRecipients.mockResolvedValue(page(sampleRecipients));
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
      mockedFetchRecipients.mockResolvedValue(page(sampleRecipients));
      const onConfirmSelection = renderMultiple();

      expect(
        await screen.findByRole('button', { name: '次へ' }),
      ).toBeDisabled();
      expect(onConfirmSelection).not.toHaveBeenCalled();
    });

    it('選んだ相手を選択順で親へ渡す', async () => {
      mockedFetchRecipients.mockResolvedValue(page(sampleRecipients));
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
      mockedFetchRecipients.mockResolvedValue(page(sampleRecipients));
      const onConfirmSelection = renderMultiple();

      const taro = await screen.findByRole('checkbox', { name: '山田 太郎' });
      fireEvent.click(taro);
      fireEvent.click(screen.getByRole('checkbox', { name: '佐藤 花子' }));
      fireEvent.click(taro);
      fireEvent.click(screen.getByRole('button', { name: '次へ' }));

      expect(onConfirmSelection).toHaveBeenCalledWith([sampleRecipients[1]]);
    });

    it('選択中の人数を表示する', async () => {
      mockedFetchRecipients.mockResolvedValue(page(sampleRecipients));
      renderMultiple();

      expect(await screen.findByText('選択中 0人')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('checkbox', { name: '山田 太郎' }));

      expect(screen.getByText('選択中 1人')).toBeInTheDocument();
    });

    // backendは1リクエスト50件までしか受け付けないため、選択の時点で止める。
    it('上限に達したら未選択の相手を選べなくする', async () => {
      mockedFetchRecipients.mockResolvedValue(page(sampleRecipients));
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
