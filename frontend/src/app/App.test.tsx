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
});
