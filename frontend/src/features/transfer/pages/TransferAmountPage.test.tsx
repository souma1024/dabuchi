import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { TransferAmountPage } from './TransferAmountPage';

describe('TransferAmountPage', () => {
  it('遷移元から相手が渡されない場合はモックの相手を表示する', () => {
    render(
      <MemoryRouter>
        <TransferAmountPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('佐藤次郎')).toBeInTheDocument();
    expect(screen.getByText('80,000円')).toBeInTheDocument();
  });

  it('送金上限額を超える金額を入力すると送金ボタンが無効になる', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <TransferAmountPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('送金金額'), '999999');

    expect(screen.getByText('送金上限額を超えています')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '送金' })).toBeDisabled();
  });

  it('有効な金額を入力して送金すると完了メッセージを表示する', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <TransferAmountPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('送金金額'), '1000');
    await user.click(screen.getByRole('button', { name: '送金' }));

    expect(screen.getByText('送金が完了しました')).toBeInTheDocument();
  });
});
