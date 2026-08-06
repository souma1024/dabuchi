import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchTransactions } from '../api/transactionsClient';
import type { Transaction } from '../types';
import { TransactionsPage } from './TransactionsPage';
import { installManualIntersectionObserver } from '../../../test/intersectionObserver';

vi.mock('../api/transactionsClient', () => ({
  fetchTransactions: vi.fn(),
}));

const mockedFetch = vi.mocked(fetchTransactions);

/** 表示件数の検証用に、必要な分だけ取引を作る。 */
function makeTransactions(count: number, offset = 0): Transaction[] {
  return Array.from({ length: count }, (_, index) => ({
    id: String(offset + index + 1),
    counterparty: {
      id: `0198fb84-b222-7abc-8def-${String(offset + index).padStart(12, '0')}`,
      name: `相手${offset + index + 1}`,
      profileUrl: '/assets/profiles/human1.png',
    },
    amount: 1200,
    direction: 'sent' as const,
    createdAt: '2026-08-05T01:00:00.000Z',
  }));
}

// 一覧末尾の監視は手で発火させる（jsdomにIntersectionObserverが無いため）。
const intersection = installManualIntersectionObserver();

beforeEach(() => {
  mockedFetch.mockReset();
  intersection.reset();
});

function renderPage(onBack?: () => void) {
  return render(<TransactionsPage onBack={onBack} />);
}

describe('TransactionsPage', () => {
  it('取引を一覧表示する', async () => {
    mockedFetch.mockResolvedValue({
      transactions: makeTransactions(3),
      nextCursor: null,
    });

    renderPage();

    expect(await screen.findByText('相手1')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(mockedFetch).toHaveBeenCalledWith(null);
  });

  it('取引が無いときは次の行動を示す空状態を表示する', async () => {
    mockedFetch.mockResolvedValue({ transactions: [], nextCursor: null });

    renderPage();

    expect(await screen.findByText('まだ取引がありません')).toBeInTheDocument();
    expect(
      screen.getByText('送金すると、ここに履歴が残ります'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it('末尾に到達したら次のページを追加で読み込む', async () => {
    mockedFetch
      .mockResolvedValueOnce({
        transactions: makeTransactions(20),
        nextCursor: 'next-cursor',
      })
      .mockResolvedValueOnce({
        transactions: makeTransactions(12, 20),
        nextCursor: null,
      });

    renderPage();

    // 1ページ目の20件。追加読み込み用のsentinelはaria-hiddenのため件数に含まれない。
    await waitFor(() => {
      expect(screen.getAllByRole('listitem')).toHaveLength(20);
    });

    await intersection.trigger();

    // 2回目の取得が走ったことを先に確認する。
    // 32件の描画完了だけを待つと、他ワーカーと並行実行された際に既定の1秒を超えることがある。
    await waitFor(() => {
      expect(mockedFetch).toHaveBeenCalledTimes(2);
    });
    expect(mockedFetch).toHaveBeenLastCalledWith('next-cursor');

    await waitFor(() => {
      expect(screen.getAllByRole('listitem')).toHaveLength(32);
    });
  });

  it('取得に失敗したらエラーを表示する', async () => {
    mockedFetch.mockRejectedValue(
      new Error('取引履歴の取得に失敗しました (HTTP 500)'),
    );

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '取引履歴の取得に失敗しました (HTTP 500)',
    );
  });

  it('onBackを渡すと戻るボタンから通知する', async () => {
    mockedFetch.mockResolvedValue({
      transactions: makeTransactions(1),
      nextCursor: null,
    });
    const onBack = vi.fn();

    renderPage(onBack);

    fireEvent.click(await screen.findByRole('button', { name: '戻る' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
