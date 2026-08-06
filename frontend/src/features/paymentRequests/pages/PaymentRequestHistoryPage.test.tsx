import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as mockModule from '../mockPaymentRequests';
import { PaymentRequestHistoryPage } from './PaymentRequestHistoryPage';
import { installManualIntersectionObserver } from '../../../test/intersectionObserver';

// 一覧末尾の監視は手で発火させる（jsdomにIntersectionObserverが無いため）。
const intersection = installManualIntersectionObserver();

beforeEach(() => {
  intersection.reset();
});

afterEach(() => {
  // unstubAllGlobalsは呼ばない。setup.tsが登録したIntersectionObserverまで
  // 消えてしまい、テスト終了後に遅れて走るeffectがundefinedを参照するため。
  // beforeEachで毎回登録し直しているので、テスト間の漏れはない。
  vi.restoreAllMocks();
});

describe('PaymentRequestHistoryPage', () => {
  it('初期表示は受けた請求タブにする', async () => {
    render(<PaymentRequestHistoryPage />);

    await screen.findAllByRole('listitem');

    expect(
      screen.getByRole('button', { name: '受けた請求', pressed: true }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '出した請求', pressed: false }),
    ).toBeInTheDocument();
  });

  // 未払いも決着済みも含めた全記録を出す（Issue #61）。
  it('未払い・支払済・キャンセルをまとめて表示する', async () => {
    render(<PaymentRequestHistoryPage />);

    const items = await screen.findAllByRole('listitem');
    const text = items.map((item) => item.textContent ?? '').join(' ');

    expect(text).toContain('未払い');
    expect(text).toContain('支払済');
    expect(text).toContain('キャンセル');
  });

  // 同じstatusでも方向で意味が変わる（acceptedは支払済／受取済）。
  it('タブを切り替えると状態のラベルが変わる', async () => {
    render(<PaymentRequestHistoryPage />);
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
    expect(
      screen
        .getAllByRole('listitem')
        .map((item) => item.textContent ?? '')
        .join(' '),
    ).not.toContain('未払い');
  });

  // 前のタブのデータが、新しいタブのものとして一時表示されないようにする。
  it('タブ切り替え直後は前のタブの一覧を残さない', async () => {
    render(<PaymentRequestHistoryPage />);
    await screen.findAllByRole('listitem');
    // 切り替え後の取得を解決させず、前の結果が残っていれば検出できるようにする。
    vi.spyOn(
      mockModule,
      'fetchMockPaymentRequestHistoryPage',
    ).mockImplementation(() => new Promise(() => undefined));

    await userEvent.click(screen.getByRole('button', { name: '出した請求' }));

    await waitFor(() => {
      expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    });
    expect(screen.getByText('読み込み中…')).toBeInTheDocument();
  });

  it('タブを切り替えると1ページ目から読み直す', async () => {
    const spy = vi.spyOn(mockModule, 'fetchMockPaymentRequestHistoryPage');
    render(<PaymentRequestHistoryPage />);
    await screen.findAllByRole('listitem');

    await userEvent.click(screen.getByRole('button', { name: '出した請求' }));

    await waitFor(() => {
      expect(spy).toHaveBeenLastCalledWith('sent', null);
    });
  });

  it('下端に達したら続きを読み込んで追記する', async () => {
    render(<PaymentRequestHistoryPage />);
    const initial = (await screen.findAllByRole('listitem')).length;

    await intersection.trigger();

    await waitFor(() => {
      expect(screen.getAllByRole('listitem').length).toBeGreaterThan(initial);
    });
  });

  it('1件も無ければ案内を出す', async () => {
    vi.spyOn(
      mockModule,
      'fetchMockPaymentRequestHistoryPage',
    ).mockResolvedValue({ requests: [], nextCursor: null });

    render(<PaymentRequestHistoryPage />);

    expect(await screen.findByText('まだ請求がありません')).toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('取得に失敗したらエラーを伝える', async () => {
    vi.spyOn(
      mockModule,
      'fetchMockPaymentRequestHistoryPage',
    ).mockRejectedValue(new Error('取得に失敗しました'));

    render(<PaymentRequestHistoryPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '取得に失敗しました',
    );
  });

  it('戻るでホームへ戻す', async () => {
    const onBack = vi.fn();
    render(<PaymentRequestHistoryPage onBack={onBack} />);
    await screen.findAllByRole('listitem');

    await userEvent.click(screen.getByRole('button', { name: '戻る' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  // 承認画面（Issue #61）が未実装のため、行は押せない。
  it('行にリンクを持たせない', async () => {
    render(<PaymentRequestHistoryPage />);

    const items = await screen.findAllByRole('listitem');

    for (const item of items) {
      expect(within(item).queryByRole('link')).not.toBeInTheDocument();
    }
  });
});
