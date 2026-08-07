import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { stubAuthenticatedSession } from '../test/session';
import { App } from './App';

// ホーム画面自体の表示内容はHomePage.test.tsxで検証する。
describe('App', () => {
  // unstubAllGlobalsは呼ばない。setup.tsが登録したIntersectionObserverまで
  // 消えてしまい、遅れて走るeffectがundefinedを参照するため。
  beforeEach(() => {
    stubAuthenticatedSession();
  });

  it('初期表示でホーム画面を表示する', async () => {
    render(<App />);

    // ログイン確認を待ってから画面が出る。
    expect(
      await screen.findByRole('heading', { level: 1, name: 'DABUCHI' }),
    ).toBeInTheDocument();
  });

  it('「請求する」リンクから相手選択画面（請求目的）のパスへ遷移できる', async () => {
    render(<App />);

    const link = await screen.findByRole('link', { name: '請求する' });
    expect(link).toHaveAttribute('href', '/recipients?purpose=billing');
  });

  // 請求相手はlocation.stateで渡される。直接/billingを開くと相手が分からないため、
  // モックの相手へフォールバックせず請求相手選択画面へ戻す（選んでいない相手への請求を防ぐ）。
  it('相手未選択で/billingへ直接遷移した場合は請求相手選択画面へ戻す', async () => {
    window.history.pushState({}, '', '/billing');
    render(<App />);

    await waitFor(() => {
      expect(window.location.pathname).toBe('/recipients');
    });
    expect(window.location.search).toBe('?purpose=billing');
    expect(
      screen.queryByRole('heading', { name: /請求先/ }),
    ).not.toBeInTheDocument();
  });
});
