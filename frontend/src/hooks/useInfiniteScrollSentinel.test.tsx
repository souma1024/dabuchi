import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useInfiniteScrollSentinel } from './useInfiniteScrollSentinel';

let triggerIntersection: (() => void) | null = null;
let disconnected = 0;

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
  disconnect() {
    disconnected += 1;
  }
  unobserve() {}
}

// setup.tsの既定スタブをこのファイル全体で一度だけ差し替える。
// テストごとに差し替えると、前テストの残りeffectがflushされる間に
// クラスが入れ替わり、監視の登録先が食い違う余地が残る。
vi.stubGlobal('IntersectionObserver', ManualIntersectionObserver);

beforeEach(() => {
  triggerIntersection = null;
  disconnected = 0;
});

afterEach(() => {
  // unstubAllGlobalsは呼ばない。setup.tsが登録したものまで消えるため。
  vi.restoreAllMocks();
});

function Sample({
  loadMore,
  showSentinel = true,
}: {
  loadMore: () => void;
  showSentinel?: boolean;
}) {
  const sentinelRef = useInfiniteScrollSentinel<HTMLLIElement>(loadMore);

  return (
    <ul>
      <li>本体</li>
      {showSentinel && <li ref={sentinelRef} data-testid="sentinel" />}
    </ul>
  );
}

describe('useInfiniteScrollSentinel', () => {
  it('目印が見えたらloadMoreを呼ぶ', () => {
    const loadMore = vi.fn();
    render(<Sample loadMore={loadMore} />);

    triggerIntersection?.();

    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it('目印を描画しなければ監視しない', () => {
    const loadMore = vi.fn();
    render(<Sample loadMore={loadMore} showSentinel={false} />);

    expect(screen.queryByTestId('sentinel')).not.toBeInTheDocument();
    expect(triggerIntersection).toBeNull();
    expect(loadMore).not.toHaveBeenCalled();
  });

  it('アンマウントで監視を止める', () => {
    const { unmount } = render(<Sample loadMore={vi.fn()} />);

    unmount();

    expect(disconnected).toBeGreaterThan(0);
  });
});
