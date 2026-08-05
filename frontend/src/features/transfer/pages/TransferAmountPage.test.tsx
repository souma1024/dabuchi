import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TransferAmountPage } from './TransferAmountPage';

describe('TransferAmountPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('遷移元から相手が渡されない場合はモックの相手を表示する', () => {
    render(
      <MemoryRouter>
        <TransferAmountPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('佐藤次郎')).toBeInTheDocument();
    expect(screen.getByText('80,000円')).toBeInTheDocument();
  });

  it('遷移元から有効な相手が渡された場合はその相手を表示する', () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/',
            state: { recipient: { id: '9', name: 'テスト花子' } },
          },
        ]}
      >
        <TransferAmountPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('テスト花子')).toBeInTheDocument();
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

  it('送金APIに金額と送金先userIdを送信し、成功したら完了メッセージを表示する', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <TransferAmountPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('送金金額'), '1000');
    await user.click(screen.getByRole('button', { name: '送金' }));

    expect(await screen.findByText('送金が完了しました')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/transfers',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ userId: '2', amount: 1000 }),
      }),
    );
  });

  it('送金APIが失敗した場合はエラーメッセージを表示する', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <TransferAmountPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('送金金額'), '1000');
    await user.click(screen.getByRole('button', { name: '送金' }));

    expect(
      await screen.findByText(
        '送金に失敗しました。時間をおいて再度お試しください。',
      ),
    ).toBeInTheDocument();
  });
});
