import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as mockModule from '../mockPaymentRequests';
import type { PaymentRequest } from '../types';
import { ReceivedPaymentRequestSection } from './ReceivedPaymentRequestSection';

// IntersectionObserverはjsdomに無いため、observe対象を保持して手動で発火させる。
let triggerIntersection: (() => void) | null = null;

class ManualIntersectionObserver {
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
}

// setup.tsの既定スタブをこのファイル全体で一度だけ差し替える。
// テストごとに差し替え直すと、前テストの残りeffectがflushされる短い間に
// 別のクラスが入れ替わり、監視の登録先が食い違う余地が残る。
vi.stubGlobal('IntersectionObserver', ManualIntersectionObserver);

beforeEach(() => {
  triggerIntersection = null;
});

afterEach(() => {
  // unstubAllGlobalsは呼ばない。setup.tsが登録したIntersectionObserverまで
  // 消えてしまい、テスト終了後に遅れて走るeffectがundefinedを参照するため。
  vi.restoreAllMocks();
});

// 請求履歴へのLinkを含むため、Router配下で描画する。
function renderSection() {
  return render(
    <MemoryRouter>
      <ReceivedPaymentRequestSection />
    </MemoryRouter>,
  );
}

// ページングの挙動は件数に依存しない。実データ（25件）を描画すると
// 並列実行時に描画待ちが伸びてタイムアウトすることがあるため、少件数で確認する。
function stubPages(pageSizes: readonly number[]) {
  let index = 0;

  return vi
    .spyOn(mockModule, 'fetchMockReceivedPaymentRequestPage')
    .mockImplementation(() => {
      const size = pageSizes[index] ?? 0;
      const isLast = index >= pageSizes.length - 1;
      const [seed] = mockModule.mockReceivedPaymentRequests;
      const requests: PaymentRequest[] =
        seed === undefined
          ? []
          : Array.from({ length: size }, (_, i) => ({
              ...seed,
              id: `stub-${String(index)}-${String(i)}`,
            }));
      index += 1;

      return Promise.resolve({
        requests,
        nextCursor: isLast ? null : String(index),
      });
    });
}

describe('ReceivedPaymentRequestSection', () => {
  // 実APIは20件固定で返す（Issue #70）。取得した分をそのまま並べる。
  it('初期表示は1ページ分の20件にする', async () => {
    renderSection();

    // 末尾の読み込み検知用の要素を除いた件数で数える。
    expect(await screen.findAllByRole('listitem')).toHaveLength(20);
  });

  it('相手の氏名・請求日・金額を表示する', async () => {
    renderSection();

    const firstItem = (await screen.findAllByRole('listitem'))[0];

    expect(firstItem).toHaveTextContent('佐藤 花子');
    expect(firstItem).toHaveTextContent('3,000円');
    expect(firstItem).toHaveTextContent('8/5');
  });

  it('下端に達したら続きを読み込んで追記する', async () => {
    renderSection();

    await screen.findAllByRole('listitem');
    triggerIntersection?.();

    await waitFor(() => {
      expect(screen.getAllByRole('listitem')).toHaveLength(25);
    });
  });

  // 元のアンバー色のボタンを一覧に置き換えたぶん、件数で気づけるようにする（Issue #44）。
  it('続きがあるときは件数に+を付ける', async () => {
    stubPages([2, 1]);
    renderSection();

    await screen.findAllByRole('listitem');

    expect(
      screen.getByRole('heading', { name: /請求されています/ }),
    ).toHaveTextContent('2+');
  });

  it('すべて読み込んだら実際の件数だけを出す', async () => {
    stubPages([2, 1]);
    renderSection();
    await screen.findAllByRole('listitem');

    triggerIntersection?.();

    await waitFor(() => {
      expect(screen.getAllByRole('listitem')).toHaveLength(3);
    });
    const heading = screen.getByRole('heading', { name: /請求されています/ });
    expect(heading).toHaveTextContent('3');
    expect(heading).not.toHaveTextContent('3+');
  });

  it('請求が0件なら件数を出さない', async () => {
    vi.spyOn(
      mockModule,
      'fetchMockReceivedPaymentRequestPage',
    ).mockResolvedValue({ requests: [], nextCursor: null });

    renderSection();

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

  it('最後まで読み込んだらそれ以上増えない', async () => {
    stubPages([2, 1]);
    renderSection();
    await screen.findAllByRole('listitem');
    triggerIntersection?.();
    await waitFor(() => {
      expect(screen.getAllByRole('listitem')).toHaveLength(3);
    });

    triggerIntersection?.();

    await waitFor(() => {
      expect(screen.getAllByRole('listitem')).toHaveLength(3);
    });
  });

  // セクションごと消すと機能の存在に気づけないため、見出しは残す（Issue #44）。
  it('請求が0件でも見出しを残し、無い旨を伝える', async () => {
    vi.spyOn(
      mockModule,
      'fetchMockReceivedPaymentRequestPage',
    ).mockResolvedValue({ requests: [], nextCursor: null });

    renderSection();

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

    renderSection();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '取得に失敗しました',
    );
  });
});
