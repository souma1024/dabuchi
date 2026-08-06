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

  it('メッセージ欄を表示する', () => {
    render(
      <MemoryRouter>
        <BillingAmountPage />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText('メッセージ（任意）')).toBeInTheDocument();
  });

  // 請求は自分の口座からお金が出ないため、残高による上限を設けない。
  it('上限額は表示しない', () => {
    render(
      <MemoryRouter>
        <BillingAmountPage />
      </MemoryRouter>,
    );

    expect(screen.queryByText('請求上限額')).not.toBeInTheDocument();
  });

  // 送金は残高（80,000円）で頭打ちになるが、請求はその制約を受けない。
  it('送金の上限（残高80,000円）を超える金額でも請求できる', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <BillingAmountPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('請求金額'), '999999');

    expect(
      screen.queryByText('請求上限額を超えています'),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '請求' })).toBeEnabled();
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
