import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitestのglobalsを使わない構成のため、各テスト後のDOMクリーンアップを明示的に登録する。
afterEach(() => {
  cleanup();
});
