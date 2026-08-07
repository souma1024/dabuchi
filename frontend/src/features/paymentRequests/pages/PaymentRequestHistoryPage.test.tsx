import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { installManualIntersectionObserver } from '../../../test/intersectionObserver';
import { fetchPaymentRequests } from '../api/paymentRequestsClient';
import type { PaymentRequest, PaymentRequestStatus } from '../types';
import { PaymentRequestHistoryPage } from './PaymentRequestHistoryPage';

vi.mock('../api/paymentRequestsClient', () => ({
  fetchPaymentRequests: vi.fn(),
}));

const mockedFetch = vi.mocked(fetchPaymentRequests);

// 一覧末尾の監視は手で発火させる（jsdomにIntersectionObserverが無いため）。
const intersection = installManualIntersectionObserver();

/** 状態を指定して請求を作る。決着済みはrespondedAtとendedByMeを持つ。 */
function makeRequests(
  statuses: readonly PaymentRequestStatus[],
  offset = 0,
): PaymentRequest[] {
  return statuses.map((status, index) => ({
    id: `payment-request-${String(offset + index + 1)}`,
    counterparty: {
      id: `5e5a4a1e-3b42-4f47-8b1f-b77ef98bf${String(offset + index + 2).padStart(3, '0')}`,
      name: `テストユーザー${String(offset + index + 1)}`,
      profileUrl: '/assets/profiles/human2.png',
    },
    amount: 3000,
    status,
    endedByMe: status === 'pending' ? null : true,
    createdAt: '2026-08-03T01:00:00.000Z',
    respondedAt: status === 'pending' ? null : '2026-08-04T01:00:00.000Z',
  }));
}

beforeEach(() => {
  intersection.reset();
  mockedFetch.mockReset();
  mockedFetch.mockResolvedValue({
    requests: makeRequests(['pending', 'accepted', 'rejected']),
    nextCursor: null,
  });
});

// 行が確認画面へのLinkを持つため、Router配下で描画する。
function renderPage(props: { onBack?: () => void } = {}) {
  return render(
    <MemoryRouter initialEntries={['/payment-requests']}>
      <PaymentRequestHistoryPage {...props} />
    </MemoryRouter>,
  );
}

describe('PaymentRequestHistoryPage', () => {
  it('初期表示は受けた請求タブにする', async () => {
    renderPage();

    await screen.findAllByRole('listitem');

    expect(
      screen.getByRole('button', { name: '受けた請求', pressed: true }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '出した請求', pressed: false }),
    ).toBeInTheDocument();
  });

  // 未払いも決着済みも含めた全記録を出す（Issue #61）。statusで絞らない。
  it('未払い・支払済・決着済みをまとめて表示する', async () => {
    renderPage();

    const items = await screen.findAllByRole('listitem');
    const text = items.map((item) => item.textContent ?? '').join(' ');

    expect(text).toContain('未払い');
    expect(text).toContain('支払済');
    // rejectedは拒否と取り下げに分かれる。fixtureは自分が終わらせた扱い。
    expect(text).toContain('拒否');
    expect(mockedFetch).toHaveBeenCalledWith({
      direction: 'received',
      cursor: null,
    });
  });

  // 同じstatusでも方向で意味が変わる（acceptedは支払済／受取済）。
  it('タブを切り替えると状態のラベルが変わる', async () => {
    renderPage();
    await screen.findAllByRole('listitem');

    await userEvent.click(screen.getByRole('button', { name: '出した請求' }));

    await waitFor(() => {
      const text = screen
        .getAllByRole('listitem')
        .map((item) => item.textContent ?? '')
        .join(' ');
      expect(text).toContain('請求中');
      expect(text).toContain('受取済');
    });
  });

  it('タブを切り替えると1ページ目から読み直す', async () => {
    renderPage();
    await screen.findAllByRole('listitem');

    await userEvent.click(screen.getByRole('button', { name: '出した請求' }));

    await waitFor(() => {
      expect(mockedFetch).toHaveBeenLastCalledWith({
        direction: 'sent',
        cursor: null,
      });
    });
  });

  // 前のタブのデータが、新しいタブのものとして一時表示されないようにする。
  it('タブ切り替え直後は前のタブの一覧を残さない', async () => {
    renderPage();
    await screen.findAllByRole('listitem');
    // 切り替え後の取得を解決させず、前の結果が残っていれば検出できるようにする。
    mockedFetch.mockImplementation(() => new Promise(() => undefined));

    await userEvent.click(screen.getByRole('button', { name: '出した請求' }));

    await waitFor(() => {
      expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    });
    expect(screen.getByText('読み込み中…')).toBeInTheDocument();
  });

  it('下端に達したら続きを読み込んで追記する', async () => {
    mockedFetch
      .mockResolvedValueOnce({
        requests: makeRequests(['pending', 'accepted']),
        nextCursor: '2',
      })
      .mockResolvedValueOnce({
        requests: makeRequests(['rejected'], 2),
        nextCursor: null,
      });
    renderPage();
    await screen.findAllByRole('listitem');

    await intersection.trigger();

    await waitFor(() => {
      expect(screen.getAllByRole('listitem')).toHaveLength(3);
    });
  });

  it('1件も無ければ案内を出す', async () => {
    mockedFetch.mockResolvedValue({ requests: [], nextCursor: null });

    renderPage();

    expect(await screen.findByText('まだ請求がありません')).toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('取得に失敗したらエラーを伝える', async () => {
    mockedFetch.mockRejectedValue(new Error('取得に失敗しました'));

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '取得に失敗しました',
    );
  });

  it('戻るでホームへ戻す', async () => {
    const onBack = vi.fn();
    renderPage({ onBack });
    await screen.findAllByRole('listitem');

    await userEvent.click(screen.getByRole('button', { name: '戻る' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  // 決着していない請求だけ確認画面へ進める（Issue #61）。
  it('未払いの行だけ確認画面へのリンクにする', async () => {
    renderPage();

    const items = await screen.findAllByRole('listitem');
    const pendingItem = items.find((item) =>
      (item.textContent ?? '').includes('未払い'),
    );
    const doneItem = items.find((item) =>
      (item.textContent ?? '').includes('支払済'),
    );

    expect(within(pendingItem!).getByRole('link')).toBeInTheDocument();
    expect(within(doneItem!).queryByRole('link')).not.toBeInTheDocument();
  });
});
