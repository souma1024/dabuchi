import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App';

// ホーム画面自体の表示内容はHomePage.test.tsxで検証する。
describe('App', () => {
  it('初期表示でホーム画面を表示する', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'dabuchi' }),
    ).toBeInTheDocument();
  });

  it('「請求する」リンクから相手選択画面（請求目的）のパスへ遷移できる', () => {
    render(<App />);

    const link = screen.getByRole('link', { name: '請求する' });
    expect(link).toHaveAttribute('href', '/recipients?purpose=billing');
  });

  // 請求相手はlocation.stateで渡される。直接/billingを開くと相手が分からないため、
  // モックの相手へフォールバックせず請求相手選択画面へ戻す（選んでいない相手への請求を防ぐ）。
  it('相手未選択で/billingへ直接遷移した場合は請求相手選択画面へ戻す', () => {
    window.history.pushState({}, '', '/billing');
    render(<App />);

    expect(window.location.pathname).toBe('/recipients');
    expect(window.location.search).toBe('?purpose=billing');
    expect(
      screen.queryByRole('heading', { name: /請求先/ }),
    ).not.toBeInTheDocument();
  });
});
