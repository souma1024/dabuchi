import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App';

describe('App', () => {
  it('プロジェクト名と準備完了メッセージを表示する', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'dabuchi' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('チーム開発の準備ができました。'),
    ).toBeInTheDocument();
  });

  it('「送金する」リンクから送金金額入力画面のパスへ遷移できる', () => {
    render(<App />);

    const link = screen.getByRole('link', { name: '送金する' });
    expect(link).toHaveAttribute('href', '/transfer');
  });
});
