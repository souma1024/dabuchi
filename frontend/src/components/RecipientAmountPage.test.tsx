import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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

  it('maxAmountの値ちょうどの金額は送信できる', async () => {
    const user = userEvent.setup();
    renderPage({
      maxAmount: {
        value: 1000,
        label: '送金上限額',
        exceededMessage: '送金上限額を超えています',
      },
    });

    await user.type(screen.getByLabelText('請求金額'), '1000');

    expect(
      screen.queryByText('送金上限額を超えています'),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '請求' })).toBeEnabled();
  });

  it('secondaryMaxを超えるとそのメッセージを表示し、maxAmount内でも送信できない', async () => {
    const user = userEvent.setup();
    renderPage({
      maxAmount: {
        value: 80000,
        label: '送金上限額',
        exceededMessage: '送金上限額を超えています',
      },
      secondaryMax: { value: 1000, exceededMessage: '残高が不足しています' },
    });

    await user.type(screen.getByLabelText('請求金額'), '1001');

    expect(screen.getByText('残高が不足しています')).toBeInTheDocument();
    expect(
      screen.queryByText('送金上限額を超えています'),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '請求' })).toBeDisabled();
  });

  it('maxAmountを超える場合はsecondaryMaxより上限額メッセージを優先する', async () => {
    const user = userEvent.setup();
    renderPage({
      maxAmount: {
        value: 80000,
        label: '送金上限額',
        exceededMessage: '送金上限額を超えています',
      },
      secondaryMax: { value: 1000, exceededMessage: '残高が不足しています' },
    });

    await user.type(screen.getByLabelText('請求金額'), '80001');

    expect(screen.getByText('送金上限額を超えています')).toBeInTheDocument();
    expect(screen.queryByText('残高が不足しています')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '請求' })).toBeDisabled();
  });

  it('maxAmountが未指定の場合、上限額ラベルは表示されず上限内なら送信できる', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('請求金額'), '80000');

    expect(screen.queryByText(/上限額/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '請求' })).toBeEnabled();
  });

  it('maxAmountが未指定でも1回の上限（80,000円）ちょうどは送信できる', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('請求金額'), '80000');

    expect(
      screen.queryByText('80,000円を超える金額は指定できません'),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '請求' })).toBeEnabled();
  });

  it('maxAmountが未指定でも1回の上限（80,000円）を超えるとエラー表示され送信できない', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('請求金額'), '80001');

    expect(
      screen.getByText('80,000円を超える金額は指定できません'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '請求' })).toBeDisabled();
  });

  it('安全な整数の範囲を超える金額を入力するとエラー表示され送信ボタンが無効になる', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('請求金額'), '9'.repeat(20));

    expect(
      screen.getByText('入力できる金額の桁数を超えています'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '請求' })).toBeDisabled();
  });

  // 入力しても送信されない項目は置かない。backendがmessageへ対応したら
  // onSubmitへ渡す形で追加する。
  it('送信されないメッセージ欄は表示しない', () => {
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

  it('completeNoteを指定した場合は完了画面に補足を表示する', async () => {
    const user = userEvent.setup();
    renderPage({ completeNote: '残高の更新はまだ反映されていません。' });

    await user.type(screen.getByLabelText('請求金額'), '1000');
    await user.click(screen.getByRole('button', { name: '請求' }));

    expect(
      await screen.findByText('残高の更新はまだ反映されていません。'),
    ).toBeInTheDocument();
  });

  it('completeNoteを指定しない場合は完了画面に補足を表示しない', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('請求金額'), '1000');
    await user.click(screen.getByRole('button', { name: '請求' }));

    await screen.findByText('請求が完了しました');
    expect(
      screen.queryByText('残高の更新はまだ反映されていません。'),
    ).not.toBeInTheDocument();
  });

  it('送信中は金額欄を編集できず、応答待ち中に金額を変更しても完了画面には送信時点の金額を表示する', async () => {
    let resolveSubmit: () => void = () => {};
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        }),
    );
    const user = userEvent.setup();
    renderPage({ onSubmit });

    await user.type(screen.getByLabelText('請求金額'), '1000');
    await user.click(screen.getByRole('button', { name: '請求' }));

    expect(screen.getByLabelText('請求金額')).toBeDisabled();

    resolveSubmit();

    expect(await screen.findByText('請求が完了しました')).toBeInTheDocument();
    expect(
      screen.getByText('テスト花子さんに1,000円を請求しました。'),
    ).toBeInTheDocument();
    expect(onSubmit).toHaveBeenCalledWith(1000);
  });

  it('連続でクリックしてもonSubmitは1回だけ実行される', async () => {
    let resolveSubmit: () => void = () => {};
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        }),
    );
    const user = userEvent.setup();
    renderPage({ onSubmit });

    await user.type(screen.getByLabelText('請求金額'), '1000');
    const button = screen.getByRole('button', { name: '請求' });
    fireEvent.click(button);
    fireEvent.click(button);

    resolveSubmit();
    await screen.findByText('請求が完了しました');

    expect(onSubmit).toHaveBeenCalledTimes(1);
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

  it('送信に失敗した後は入力欄が再度有効になり、再送信できる', async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValueOnce(new Error('failed'))
      .mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    renderPage({ onSubmit });

    await user.type(screen.getByLabelText('請求金額'), '1000');
    await user.click(screen.getByRole('button', { name: '請求' }));

    await screen.findByText(
      '請求に失敗しました。時間をおいて再度お試しください。',
    );
    expect(screen.getByLabelText('請求金額')).toBeEnabled();

    await user.click(screen.getByRole('button', { name: '請求' }));

    expect(await screen.findByText('請求が完了しました')).toBeInTheDocument();
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });
});
