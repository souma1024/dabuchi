import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fetchMockTransactionPage,
  mockTransactions,
} from '../mockTransactions';
import { TransactionsPage } from './TransactionsPage';

vi.mock('../mockTransactions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../mockTransactions')>();
  return { ...actual, fetchMockTransactionPage: vi.fn() };
});

const mockedFetch = vi.mocked(fetchMockTransactionPage);

// IntersectionObserverはjsdomに無いため、observe対象を保持して手動で発火させる。
let triggerIntersection: (() => void) | null = null;

beforeEach(() => {
  mockedFetch.mockReset();
  triggerIntersection = null;

  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(private readonly callback: IntersectionObserverCallback) {}
      observe() {
        triggerIntersection = () => {
          this.callback(
            [{ isIntersecting: true } as IntersectionObserverEntry],
            this as unknown as IntersectionObserver,
          );
        };
      }
      disconnect() {}
      unobserve() {}
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('TransactionsPage', () => {
  it('取得した取引を一覧表示する', async () => {
    mockedFetch.mockResolvedValue({
      transactions: mockTransactions.slice(0, 3),
      nextCursor: null,
    });

    render(<TransactionsPage />);

    // mockTransactionsの先頭はシード同様「佐藤 花子」から始まる。
    expect(await screen.findByText('佐藤 花子')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('取引が無いときは次の行動を示す空状態を表示する', async () => {
    mockedFetch.mockResolvedValue({ transactions: [], nextCursor: null });

    render(<TransactionsPage />);

    expect(await screen.findByText('まだ取引がありません')).toBeInTheDocument();
    expect(
      screen.getByText('送金すると、ここに履歴が残ります'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it('末尾に到達したら次のページを追加で読み込む', async () => {
    mockedFetch
      .mockResolvedValueOnce({
        transactions: mockTransactions.slice(0, 20),
        nextCursor: '20',
      })
      .mockResolvedValueOnce({
        transactions: mockTransactions.slice(20, 32),
        nextCursor: null,
      });

    render(<TransactionsPage />);

    // 1ページ目の20件。追加読み込み用のsentinelはaria-hiddenのため件数に含まれない。
    await waitFor(() => {
      expect(screen.getAllByRole('listitem')).toHaveLength(20);
    });

    triggerIntersection?.();

    await waitFor(() => {
      expect(screen.getAllByRole('listitem')).toHaveLength(32);
    });
    expect(mockedFetch).toHaveBeenCalledTimes(2);
    expect(mockedFetch).toHaveBeenLastCalledWith('20');
  });

  it('取得に失敗したらエラーを表示する', async () => {
    mockedFetch.mockRejectedValue(new Error('取得に失敗しました'));

    render(<TransactionsPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '取得に失敗しました',
    );
  });

  it('onBackを渡すと戻るボタンから通知する', async () => {
    mockedFetch.mockResolvedValue({
      transactions: mockTransactions.slice(0, 1),
      nextCursor: null,
    });
    const onBack = vi.fn();

    render(<TransactionsPage onBack={onBack} />);

    fireEvent.click(await screen.findByRole('button', { name: '戻る' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
