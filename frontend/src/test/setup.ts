import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// findBy/waitForの既定は1秒。テストファイルが増えて並列実行されると、
// 描画待ちの実時間が伸びて取得完了前に諦めることがあるため余裕を持たせる。
// 個別に{ timeout: ... }を書き足すより、待ち時間の基準を1か所に置く。
configure({ asyncUtilTimeout: 5000 });

// Vitestのglobalsを使わない構成のため、各テスト後のDOMクリーンアップを明示的に登録する。
afterEach(() => {
  cleanup();
});

// jsdomはIntersectionObserverを実装しないため、テスト用のスタブを登録する。
class IntersectionObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);
