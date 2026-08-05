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

  it('請求上限額（システム固定の上限額）とメッセージ欄を表示する', () => {
    render(
      <MemoryRouter>
        <BillingAmountPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('請求上限額')).toBeInTheDocument();
    expect(screen.getByText('100,000円')).toBeInTheDocument();
    expect(screen.getByLabelText('メッセージ（任意）')).toBeInTheDocument();
  });

  it('請求上限額を超える金額を入力すると請求ボタンが無効になる', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <BillingAmountPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('請求金額'), '999999');

    expect(screen.getByText('請求上限額を超えています')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '請求' })).toBeDisabled();
  });

  it('請求上限額ちょうど（100,000円）は送信でき、1円超える（100,001円）と無効になる', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <BillingAmountPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('請求金額'), '100000');
    expect(
      screen.queryByText('請求上限額を超えています'),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '請求' })).toBeEnabled();

    await user.type(screen.getByLabelText('請求金額'), '1');
    expect(screen.getByText('請求上限額を超えています')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '請求' })).toBeDisabled();
  });

  it('請求APIへrequests配列で被請求者IDと金額を送信し、成功したら完了メッセージを表示する', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(null, { status: 201, statusText: 'Created' }),
    );

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
      '/api/payment-requests',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          requests: [
            {
              recipientId: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf002',
              amount: 1000,
            },
          ],
        }),
      }),
    );
  });

  it('請求者IDはbackendのcurrent userで決まるため、リクエストボディへ含めない', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 201 }));

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <BillingAmountPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('請求金額'), '1000');
    await user.click(screen.getByRole('button', { name: '請求' }));

    await screen.findByText('請求が完了しました');

    const body = fetchMock.mock.calls[0]?.[1]?.body;
    expect(typeof body).toBe('string');
    expect(body).not.toContain('requesterId');
    expect(body).not.toContain('senderId');
  });

  // backendは400 INVALID_REQUEST / 404 CURRENT_USER_NOT_FOUND /
  // 422 PAYMENT_REQUEST_PARTICIPANT_NOT_FOUND / 500を返す。
  // 現時点はどれも同じ文言で扱い、code別の出し分けは行わない。
  it.each([400, 404, 422, 500])(
    '請求APIが%dを返した場合はエラーメッセージを表示する',
    async (status) => {
      const fetchMock = vi.mocked(fetch);
      fetchMock.mockResolvedValueOnce(new Response(null, { status }));

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
    },
  );
});
