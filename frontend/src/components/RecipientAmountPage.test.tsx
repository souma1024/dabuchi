import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { RecipientAmountPage } from './RecipientAmountPage';

const recipient = { id: '9', name: 'テスト花子' };

function renderPage(
  overrides: Partial<Parameters<typeof RecipientAmountPage>[0]> = {},
) {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  render(
    <MemoryRouter>
      <RecipientAmountPage
        recipient={recipient}
        heading="請求先"
        amountLabel="請求金額"
        submitLabel="請求"
        submittingLabel="送信中..."
        submitErrorMessage="請求に失敗しました。時間をおいて再度お試しください。"
        completeTitle="請求が完了しました"
        renderCompleteDescription={(r, amount) =>
          `${r.name}さんに${amount.toLocaleString()}円を請求しました。`
        }
        onSubmit={onSubmit}
        {...overrides}
      />
    </MemoryRouter>,
  );
  return { onSubmit };
}

describe('RecipientAmountPage', () => {
  it('相手の名前と見出し・金額ラベルを表示する', () => {
    renderPage();

    expect(screen.getByText('請求先')).toBeInTheDocument();
    expect(screen.getByText('テスト花子')).toBeInTheDocument();
    expect(screen.getByLabelText('請求金額')).toBeInTheDocument();
  });

  it('金額が未入力の場合は送信ボタンが無効になる', () => {
    renderPage();

    expect(screen.getByRole('button', { name: '請求' })).toBeDisabled();
  });

  it('0円を入力した場合は送信ボタンが無効になる', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('請求金額'), '0');

    expect(screen.getByRole('button', { name: '請求' })).toBeDisabled();
  });

  it('数字以外は入力できない', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('請求金額'), 'abc123');

    expect(screen.getByLabelText('請求金額')).toHaveValue('123');
  });

  it('maxAmountが指定されている場合、上限を超えるとエラー表示され送信ボタンが無効になる', async () => {
    const user = userEvent.setup();
    renderPage({
      maxAmount: {
        value: 1000,
        label: '送金上限額',
        exceededMessage: '送金上限額を超えています',
      },
    });

    await user.type(screen.getByLabelText('請求金額'), '1001');

    expect(screen.getByText('送金上限額を超えています')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '請求' })).toBeDisabled();
  });

  it('maxAmountが未指定の場合、上限額は表示されず高額でも送信できる', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('請求金額'), '999999999');

    expect(screen.queryByText(/上限額/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '請求' })).toBeEnabled();
  });

  it('showMessageFieldがtrueの場合のみメッセージ欄を表示する', () => {
    renderPage({ showMessageField: true });
    expect(screen.getByLabelText('メッセージ（任意）')).toBeInTheDocument();
  });

  it('showMessageFieldが未指定の場合はメッセージ欄を表示しない', () => {
    renderPage();
    expect(
      screen.queryByLabelText('メッセージ（任意）'),
    ).not.toBeInTheDocument();
  });

  it('送信に成功すると入力金額でonSubmitを呼び、完了画面を表示する', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderPage();

    await user.type(screen.getByLabelText('請求金額'), '1000');
    await user.click(screen.getByRole('button', { name: '請求' }));

    expect(await screen.findByText('請求が完了しました')).toBeInTheDocument();
    expect(
      screen.getByText('テスト花子さんに1,000円を請求しました。'),
    ).toBeInTheDocument();
    expect(onSubmit).toHaveBeenCalledWith(1000);
  });

  it('送信に失敗した場合はsubmitErrorMessageを表示する', async () => {
    const user = userEvent.setup();
    renderPage({ onSubmit: vi.fn().mockRejectedValue(new Error('failed')) });

    await user.type(screen.getByLabelText('請求金額'), '1000');
    await user.click(screen.getByRole('button', { name: '請求' }));

    expect(
      await screen.findByText(
        '請求に失敗しました。時間をおいて再度お試しください。',
      ),
    ).toBeInTheDocument();
  });
});
