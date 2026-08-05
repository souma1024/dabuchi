import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

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
