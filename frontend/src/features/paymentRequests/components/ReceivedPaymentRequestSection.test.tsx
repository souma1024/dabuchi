import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as mockModule from '../mockPaymentRequests';
import { ReceivedPaymentRequestSection } from './ReceivedPaymentRequestSection';

// IntersectionObserverはjsdomに無いため、observe対象を保持して手動で発火させる。
let triggerIntersection: (() => void) | null = null;

beforeEach(() => {
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
  vi.restoreAllMocks();
});

describe('ReceivedPaymentRequestSection', () => {
  // 実APIは20件固定で返す（Issue #70）。取得した分をそのまま並べる。
  it('初期表示は1ページ分の20件にする', async () => {
    render(<ReceivedPaymentRequestSection />);

    // 末尾の読み込み検知用の要素を除いた件数で数える。
    expect(await screen.findAllByRole('listitem')).toHaveLength(20);
  });

  it('相手の氏名・請求日・金額を表示する', async () => {
    render(<ReceivedPaymentRequestSection />);

    const firstItem = (await screen.findAllByRole('listitem'))[0];

    expect(firstItem).toHaveTextContent('佐藤 花子');
    expect(firstItem).toHaveTextContent('3,000円');
    expect(firstItem).toHaveTextContent('8/5');
  });

  it('下端に達したら続きを読み込んで追記する', async () => {
    render(<ReceivedPaymentRequestSection />);

    await screen.findAllByRole('listitem');
    triggerIntersection?.();

    await waitFor(() => {
      expect(screen.getAllByRole('listitem')).toHaveLength(25);
    });
  });

  // 元のアンバー色のボタンを一覧に置き換えたぶん、件数で気づけるようにする（Issue #44）。
  it('続きがあるときは件数に+を付ける', async () => {
    render(<ReceivedPaymentRequestSection />);

    await screen.findAllByRole('listitem');

    expect(
      screen.getByRole('heading', { name: /請求されています/ }),
    ).toHaveTextContent('20+');
  });

  it('すべて読み込んだら実際の件数だけを出す', async () => {
    render(<ReceivedPaymentRequestSection />);

    await screen.findAllByRole('listitem');
    triggerIntersection?.();
    await waitFor(() => {
      expect(screen.getAllByRole('listitem')).toHaveLength(25);
    });

    const heading = screen.getByRole('heading', { name: /請求されています/ });
    expect(heading).toHaveTextContent('25');
    expect(heading).not.toHaveTextContent('25+');
  });

  it('請求が0件なら件数を出さない', async () => {
    vi.spyOn(
      mockModule,
      'fetchMockReceivedPaymentRequestPage',
    ).mockResolvedValue({ requests: [], nextCursor: null });

    render(<ReceivedPaymentRequestSection />);

    await screen.findByText('請求はありません');

    expect(
      screen.getByRole('heading', { name: /請求されています/ }),
    ).toHaveTextContent('請求されています');
    expect(
      screen.getByRole('heading', { name: /請求されています/ }),
    ).not.toHaveTextContent('0');
  });

  // 遷移先の請求履歴一覧（Issue #61）が未実装のため、押せないことを明示する。
  // spanだと押せないことも押せることも伝わらないため、無効なbuttonにしている。
  it('請求履歴の入口は無効なボタンとして置く', async () => {
    render(<ReceivedPaymentRequestSection />);

    await screen.findAllByRole('listitem');
    const historyButton = screen.getByRole('button', { name: '請求履歴 ›' });

    expect(historyButton).toBeDisabled();
    expect(
      screen.queryByRole('link', { name: /請求履歴/ }),
    ).not.toBeInTheDocument();
  });

  // 「もっと見る」を押すたびにボタンが出直す違和感を避けるため、操作を置かない。
  it('読み込みのためのボタンを置かない', async () => {
    render(<ReceivedPaymentRequestSection />);

    await screen.findAllByRole('listitem');

    expect(
      screen.queryByRole('button', { name: 'もっと見る' }),
    ).not.toBeInTheDocument();
  });

  it('最後まで読み込んだらそれ以上増えない', async () => {
    render(<ReceivedPaymentRequestSection />);

    await screen.findAllByRole('listitem');
    triggerIntersection?.();
    await waitFor(() => {
      expect(screen.getAllByRole('listitem')).toHaveLength(25);
    });

    triggerIntersection?.();
    await waitFor(() => {
      expect(screen.getAllByRole('listitem')).toHaveLength(25);
    });
  });

  // セクションごと消すと機能の存在に気づけないため、見出しは残す（Issue #44）。
  it('請求が0件でも見出しを残し、無い旨を伝える', async () => {
    vi.spyOn(
      mockModule,
      'fetchMockReceivedPaymentRequestPage',
    ).mockResolvedValue({ requests: [], nextCursor: null });

    render(<ReceivedPaymentRequestSection />);

    expect(await screen.findByText('請求はありません')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: '請求されています' }),
    ).toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('取得に失敗したらエラーを伝える', async () => {
    vi.spyOn(
      mockModule,
      'fetchMockReceivedPaymentRequestPage',
    ).mockRejectedValue(new Error('取得に失敗しました'));

    render(<ReceivedPaymentRequestSection />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '取得に失敗しました',
    );
  });
});
