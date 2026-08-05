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

  it('/billingへ直接遷移すると請求作成画面を表示する', () => {
    window.history.pushState({}, '', '/billing');
    render(<App />);

    expect(screen.getByRole('heading', { name: '請求先' })).toBeInTheDocument();
  });
});
