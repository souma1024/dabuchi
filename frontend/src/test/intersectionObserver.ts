import { waitFor } from '@testing-library/react';
import { expect, vi } from 'vitest';

// このファイルはtestファイルごとに読み込まれるため、状態も各ファイルで独立する。
let trigger: (() => void) | null = null;

class ManualIntersectionObserver {
  constructor(private readonly callback: IntersectionObserverCallback) {}
  observe() {
    trigger = () => {
      this.callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      );
    };
  }
  disconnect() {}
  unobserve() {}
}

export interface ManualIntersection {
  /** 各testの前に呼び、前のtestの登録を持ち越さない。 */
  reset: () => void;
  /** 一覧末尾が見えた状態にする。監視の登録が終わるまで待ってから発火する。 */
  trigger: () => Promise<void>;
}

/**
 * 一覧末尾の監視を手で発火できるようにする。
 *
 * jsdomにIntersectionObserverが無いため、setup.tsの既定スタブを差し替える。
 * 差し替えはファイル単位で一度だけ行う。testごとに入れ替えると、前のtestの
 * 残りeffectがflushされる間にクラスが変わり、監視の登録先が食い違う。
 *
 * 監視はeffectで登録されるため、描画直後にはまだ済んでいないことがある。
 * 登録前に発火しても何も起きず、待ち時間を使い切ってから落ちるので、
 * triggerは登録を待ってから発火する。
 */
export function installManualIntersectionObserver(): ManualIntersection {
  vi.stubGlobal('IntersectionObserver', ManualIntersectionObserver);

  return {
    reset() {
      trigger = null;
    },
    async trigger() {
      await waitFor(() => {
        expect(trigger).not.toBeNull();
      });
      trigger?.();
    },
  };
}
