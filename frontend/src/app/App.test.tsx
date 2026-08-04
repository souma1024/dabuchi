import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { App } from './App';

vi.mock('../features/recipientSelection/api/fetchRecipients', () => ({
  fetchRecipients: vi.fn().mockResolvedValue([]),
}));

describe('App', () => {
  it('送金相手選択画面を表示する', async () => {
    render(<App />);

    expect(
      await screen.findByRole('heading', { level: 1, name: '送金相手を選ぶ' }),
    ).toBeInTheDocument();
  });
});
