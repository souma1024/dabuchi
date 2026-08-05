import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BillingAmountPage } from './BillingAmountPage';

describe('BillingAmountPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('遷移元から相手が渡されない場合はモックの相手を表示する', () => {
    render(
      <MemoryRouter>
        <BillingAmountPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('佐藤次郎')).toBeInTheDocument();
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
        <BillingAmountPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('テスト花子')).toBeInTheDocument();
  });

  it('送金画面と同じ送金上限額とメッセージ欄を表示する', () => {
    render(
      <MemoryRouter>
        <BillingAmountPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('送金上限額')).toBeInTheDocument();
    expect(screen.getByText('80,000円')).toBeInTheDocument();
    expect(screen.getByLabelText('メッセージ（任意）')).toBeInTheDocument();
  });

  it('送金上限額を超える金額を入力すると請求ボタンが無効になる', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <BillingAmountPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('請求金額'), '999999');

    expect(screen.getByText('送金上限額を超えています')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '請求' })).toBeDisabled();
  });

  it('請求APIに金額と請求相手userIdを送信し、成功したら完了メッセージを表示する', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <BillingAmountPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('請求金額'), '1000');
    await user.click(screen.getByRole('button', { name: '請求' }));

    expect(await screen.findByText('請求が完了しました')).toBeInTheDocument();
    expect(
      screen.getByText('佐藤次郎さんに1,000円を請求しました。'),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/billing-requests',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ userId: '2', amount: 1000 }),
      }),
    );
  });

  it('請求APIが失敗した場合はエラーメッセージを表示する', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <BillingAmountPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('請求金額'), '1000');
    await user.click(screen.getByRole('button', { name: '請求' }));

    expect(
      await screen.findByText(
        '請求に失敗しました。時間をおいて再度お試しください。',
      ),
    ).toBeInTheDocument();
  });
});
