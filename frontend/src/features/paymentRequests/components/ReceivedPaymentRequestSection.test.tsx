import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { installManualIntersectionObserver } from '../../../test/intersectionObserver';
import { fetchPaymentRequests } from '../api/paymentRequestsClient';
import type { PaymentRequest } from '../types';
import { ReceivedPaymentRequestSection } from './ReceivedPaymentRequestSection';

vi.mock('../api/paymentRequestsClient', () => ({
  fetchPaymentRequests: vi.fn(),
}));

const mockedFetch = vi.mocked(fetchPaymentRequests);

// 一覧末尾の監視は手で発火させる（jsdomにIntersectionObserverが無いため）。
const intersection = installManualIntersectionObserver();

/** 表示件数の検証用に、必要な分だけ請求を作る。 */
function makeRequests(count: number, offset = 0): PaymentRequest[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `payment-request-${String(offset + index + 1)}`,
    counterparty: {
      id: `5e5a4a1e-3b42-4f47-8b1f-b77ef98bf${String(offset + index + 2).padStart(3, '0')}`,
      name: `テストユーザー${String(offset + index + 1)}`,
      profileUrl: '/assets/profiles/human2.png',
    },
    amount: 3000,
    status: 'pending',
    createdAt: '2026-08-03T01:00:00.000Z',
    respondedAt: null,
  }));
}

beforeEach(() => {
  intersection.reset();
  mockedFetch.mockReset();
  mockedFetch.mockResolvedValue({
    requests: makeRequests(2),
    nextCursor: null,
  });
});

// 請求履歴へのLinkを含むため、Router配下で描画する。
function renderSection() {
  return render(
    <MemoryRouter>
      <ReceivedPaymentRequestSection />
    </MemoryRouter>,
  );
}

describe('ReceivedPaymentRequestSection', () => {
  // ホーム画面は未対応の請求だけを出す（Issue #44）。
  it('受けた請求の未払いだけを取得する', async () => {
    renderSection();

    await screen.findAllByRole('listitem');

    expect(mockedFetch).toHaveBeenCalledWith({
      direction: 'received',
      status: 'pending',
      cursor: null,
    });
  });

  it('取得した件数をそのまま並べる', async () => {
    mockedFetch.mockResolvedValue({
      requests: makeRequests(20),
      nextCursor: null,
    });

    renderSection();

    // 末尾の読み込み検知用の要素を除いた件数で数える。
    expect(await screen.findAllByRole('listitem')).toHaveLength(20);
  });

  it('相手の氏名・請求日・金額を表示する', async () => {
    renderSection();

    const firstItem = (await screen.findAllByRole('listitem'))[0];

    expect(firstItem).toHaveTextContent('テストユーザー1');
    expect(firstItem).toHaveTextContent('3,000円');
    expect(firstItem).toHaveTextContent('8/3');
  });

  it('下端に達したら続きを読み込んで追記する', async () => {
    mockedFetch
      .mockResolvedValueOnce({ requests: makeRequests(2), nextCursor: '2' })
      .mockResolvedValueOnce({
        requests: makeRequests(1, 2),
        nextCursor: null,
      });
    renderSection();
    await screen.findAllByRole('listitem');

    await intersection.trigger();

    await waitFor(() => {
      expect(screen.getAllByRole('listitem')).toHaveLength(3);
    });
    expect(mockedFetch).toHaveBeenLastCalledWith({
      direction: 'received',
      status: 'pending',
      cursor: '2',
    });
  });

  // 元のアンバー色のボタンを一覧に置き換えたぶん、件数で気づけるようにする（Issue #44）。
  it('続きがあるときは件数に+を付ける', async () => {
    mockedFetch.mockResolvedValue({
      requests: makeRequests(2),
      nextCursor: '2',
    });

    renderSection();

    await screen.findAllByRole('listitem');
    expect(
      screen.getByRole('heading', { name: /請求されています/ }),
    ).toHaveTextContent('2+');
  });

  it('すべて読み込んだら実際の件数だけを出す', async () => {
    mockedFetch
      .mockResolvedValueOnce({ requests: makeRequests(2), nextCursor: '2' })
      .mockResolvedValueOnce({
        requests: makeRequests(1, 2),
        nextCursor: null,
      });
    renderSection();
    await screen.findAllByRole('listitem');

    await intersection.trigger();

    await waitFor(() => {
      expect(screen.getAllByRole('listitem')).toHaveLength(3);
    });
    const heading = screen.getByRole('heading', { name: /請求されています/ });
    expect(heading).toHaveTextContent('3');
    expect(heading).not.toHaveTextContent('3+');
  });

  // nextCursorがnullなら監視要素自体を描画しないため、追加の取得は起きない。
  it('最後まで読み込んだらそれ以上取得しない', async () => {
    mockedFetch
      .mockResolvedValueOnce({ requests: makeRequests(2), nextCursor: '2' })
      .mockResolvedValueOnce({
        requests: makeRequests(1, 2),
        nextCursor: null,
      });
    renderSection();
    await screen.findAllByRole('listitem');
    await intersection.trigger();
    await waitFor(() => {
      expect(screen.getAllByRole('listitem')).toHaveLength(3);
    });

    // 2ページ目でnextCursorがnullになったため、監視要素が消えて発火しない。
    expect(mockedFetch).toHaveBeenCalledTimes(2);
  });

  it('請求が0件なら件数を出さない', async () => {
    mockedFetch.mockResolvedValue({ requests: [], nextCursor: null });

    renderSection();

    await screen.findByText('請求はありません');
    const heading = screen.getByRole('heading', { name: /請求されています/ });
    expect(heading).toHaveTextContent('請求されています');
    expect(heading).not.toHaveTextContent('0');
  });

  it('請求履歴へのリンクを置く', async () => {
    renderSection();

    await screen.findAllByRole('listitem');

    expect(screen.getByRole('link', { name: /請求履歴/ })).toHaveAttribute(
      'href',
      '/payment-requests',
    );
  });

  // 「もっと見る」を押すたびにボタンが出直す違和感を避けるため、操作を置かない。
  it('読み込みのためのボタンを置かない', async () => {
    renderSection();

    await screen.findAllByRole('listitem');

    expect(
      screen.queryByRole('button', { name: 'もっと見る' }),
    ).not.toBeInTheDocument();
  });

  // セクションごと消すと機能の存在に気づけないため、見出しは残す（Issue #44）。
  it('請求が0件でも見出しを残し、無い旨を伝える', async () => {
    mockedFetch.mockResolvedValue({ requests: [], nextCursor: null });

    renderSection();

    expect(await screen.findByText('請求はありません')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /請求されています/ }),
    ).toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('取得に失敗したらエラーを伝える', async () => {
    mockedFetch.mockRejectedValue(new Error('取得に失敗しました'));

    renderSection();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '取得に失敗しました',
    );
  });
});
