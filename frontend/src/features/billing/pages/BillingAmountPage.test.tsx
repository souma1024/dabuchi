import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Recipient } from '../../../types/user';
import { BillingAmountPage } from './BillingAmountPage';

const jiro: Recipient = {
  id: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf002',
  name: '佐藤次郎',
};
const saburo: Recipient = {
  id: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf003',
  name: '佐藤三郎',
};
const hanako: Recipient = {
  id: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf004',
  name: '佐々木花子',
};

const RECIPIENT_SELECTION_MARKER = '請求相手選択画面';

/** 相手選択画面へ戻されたことを検証できるよう、/recipientsも合わせて描画する。 */
function renderBillingPage(state: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/billing', state }]}>
      <Routes>
        <Route path="/billing" element={<BillingAmountPage />} />
        <Route
          path="/recipients"
          element={<div>{RECIPIENT_SELECTION_MARKER}</div>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

function renderWithRecipients(recipients: Recipient[]) {
  return renderBillingPage({ recipients });
}

function amountInput(name: string) {
  return screen.getByLabelText(name);
}

describe('BillingAmountPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('請求相手が渡されていない場合', () => {
    // 金融操作なので既定の相手へフォールバックしない。
    // モックの相手を表示すると、選んでいない相手への請求が登録されうる。
    it.each([
      ['stateが無い（直接/billingを開いた・再読み込みした）', undefined],
      ['recipientsが空配列', { recipients: [] }],
      ['recipientsが配列でない', { recipients: jiro }],
      ['recipientsに不正な要素が混ざる', { recipients: [jiro, { id: '' }] }],
      ['recipientsのidが重複している', { recipients: [jiro, jiro] }],
    ])('%s場合は請求相手選択画面へ戻す', (_label, state) => {
      renderBillingPage(state);

      expect(screen.getByText(RECIPIENT_SELECTION_MARKER)).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: '請求' }),
      ).not.toBeInTheDocument();
    });

    it('モックの相手（佐藤次郎）を代わりに表示しない', () => {
      renderBillingPage(undefined);

      expect(screen.queryByText('佐藤次郎')).not.toBeInTheDocument();
    });
  });

  describe('請求相手の表示', () => {
    it('選択された相手が全員並ぶ', () => {
      renderWithRecipients([jiro, saburo, hanako]);

      expect(screen.getByText('請求先（3人）')).toBeInTheDocument();
      for (const recipient of [jiro, saburo, hanako]) {
        expect(amountInput(recipient.name)).toBeInTheDocument();
      }
    });

    // 単一選択の導線（state.recipient）から来た場合も1人の請求として扱う。
    it('state.recipientで1人だけ渡された場合も表示する', () => {
      renderBillingPage({ recipient: jiro });

      expect(screen.getByText('請求先（1人）')).toBeInTheDocument();
      expect(amountInput('佐藤次郎')).toBeInTheDocument();
    });

    it('左上の戻るボタンで請求相手の選択画面へ戻る', async () => {
      const user = userEvent.setup();
      renderWithRecipients([jiro, saburo]);

      await user.click(screen.getByRole('button', { name: '戻る' }));

      expect(screen.getByText(RECIPIENT_SELECTION_MARKER)).toBeInTheDocument();
    });

    // 左上の戻るボタンが同じ役割を担うため、画面末尾のリンクは置かない。
    it('「請求相手を選び直す」ボタンは表示しない', () => {
      renderWithRecipients([jiro]);

      expect(
        screen.queryByRole('button', { name: '請求相手を選び直す' }),
      ).not.toBeInTheDocument();
    });

    it('送信されないメッセージ欄は表示しない', () => {
      renderWithRecipients([jiro]);

      expect(
        screen.queryByLabelText('メッセージ（任意）'),
      ).not.toBeInTheDocument();
    });

    // 請求は自分の口座からお金が出ないため、残高による上限を設けない。
    it('上限額は表示しない', () => {
      renderWithRecipients([jiro]);

      expect(screen.queryByText('請求上限額')).not.toBeInTheDocument();
    });
  });

  describe('金額のオートフィル', () => {
    it('最初に入力した金額を全員へ反映する', async () => {
      const user = userEvent.setup();
      renderWithRecipients([jiro, saburo, hanako]);

      await user.type(amountInput('佐藤次郎'), '1000');

      expect(amountInput('佐藤次郎')).toHaveValue('1000');
      expect(amountInput('佐藤三郎')).toHaveValue('1000');
      expect(amountInput('佐々木花子')).toHaveValue('1000');
      expect(screen.getByText('3,000円')).toBeInTheDocument();
    });

    it('オートフィル後は被請求者ごとに個別編集できる', async () => {
      const user = userEvent.setup();
      renderWithRecipients([jiro, saburo, hanako]);

      await user.type(amountInput('佐藤次郎'), '1000');
      await user.clear(amountInput('佐藤三郎'));
      await user.type(amountInput('佐藤三郎'), '2500');

      expect(amountInput('佐藤次郎')).toHaveValue('1000');
      expect(amountInput('佐藤三郎')).toHaveValue('2500');
      expect(amountInput('佐々木花子')).toHaveValue('1000');
      expect(screen.getByText('4,500円')).toBeInTheDocument();
    });

    // オートフィルは一度だけ。個別編集が始まった後に起点の欄を直しても全員へは配らない。
    it('個別編集を始めた後は起点の欄を編集しても全員へ反映しない', async () => {
      const user = userEvent.setup();
      renderWithRecipients([jiro, saburo, hanako]);

      await user.type(amountInput('佐藤次郎'), '1000');
      await user.clear(amountInput('佐藤三郎'));
      await user.type(amountInput('佐藤三郎'), '2500');
      await user.clear(amountInput('佐藤次郎'));
      await user.type(amountInput('佐藤次郎'), '300');

      expect(amountInput('佐藤次郎')).toHaveValue('300');
      expect(amountInput('佐藤三郎')).toHaveValue('2500');
      expect(amountInput('佐々木花子')).toHaveValue('1000');
    });

    it('数字以外の入力は受け付けない', async () => {
      const user = userEvent.setup();
      renderWithRecipients([jiro]);

      await user.type(amountInput('佐藤次郎'), '1a-2');

      expect(amountInput('佐藤次郎')).toHaveValue('12');
    });
  });

  describe('送信の可否', () => {
    it('全員分の金額が入力されるまで請求できない', async () => {
      const user = userEvent.setup();
      renderWithRecipients([jiro, saburo]);

      expect(screen.getByRole('button', { name: '請求' })).toBeDisabled();

      await user.type(amountInput('佐藤次郎'), '1000');
      await user.clear(amountInput('佐藤三郎'));

      expect(screen.getByRole('button', { name: '請求' })).toBeDisabled();

      await user.type(amountInput('佐藤三郎'), '2000');

      expect(screen.getByRole('button', { name: '請求' })).toBeEnabled();
    });

    it('0円が含まれる場合は請求できない', async () => {
      const user = userEvent.setup();
      renderWithRecipients([jiro, saburo]);

      await user.type(amountInput('佐藤次郎'), '1000');
      await user.clear(amountInput('佐藤三郎'));
      await user.type(amountInput('佐藤三郎'), '0');

      expect(screen.getByRole('button', { name: '請求' })).toBeDisabled();
    });

    it('桁数を超える金額はエラーを表示し請求できない', async () => {
      const user = userEvent.setup();
      renderWithRecipients([jiro]);

      await user.type(amountInput('佐藤次郎'), '99999999999999999999');

      expect(
        screen.getByText('入力できる金額の桁数を超えています'),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '請求' })).toBeDisabled();
    });

    // 送金は残高（80,000円）で頭打ちになるが、請求はその制約を受けない。
    it('送金の上限（残高80,000円）を超える金額でも請求できる', async () => {
      const user = userEvent.setup();
      renderWithRecipients([jiro]);

      await user.type(amountInput('佐藤次郎'), '999999');

      expect(screen.getByRole('button', { name: '請求' })).toBeEnabled();
    });
  });

  describe('請求APIへの送信', () => {
    it('被請求者ごとの金額をrequests配列で送信し、成功したら完了メッセージを表示する', async () => {
      const fetchMock = vi.mocked(fetch);
      fetchMock.mockResolvedValueOnce(
        new Response(null, { status: 201, statusText: 'Created' }),
      );

      const user = userEvent.setup();
      renderWithRecipients([jiro, saburo]);

      await user.type(amountInput('佐藤次郎'), '1000');
      await user.clear(amountInput('佐藤三郎'));
      await user.type(amountInput('佐藤三郎'), '2000');
      await user.click(screen.getByRole('button', { name: '請求' }));

      expect(await screen.findByText('請求が完了しました')).toBeInTheDocument();
      expect(
        screen.getByText('2人に合計3,000円を請求しました。'),
      ).toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/payment-requests',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            requests: [
              { recipientId: jiro.id, amount: 1000 },
              { recipientId: saburo.id, amount: 2000 },
            ],
          }),
        }),
      );
    });

    it('1人だけの請求でも要素1件のrequests配列で送信する', async () => {
      const fetchMock = vi.mocked(fetch);
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 201 }));

      const user = userEvent.setup();
      renderWithRecipients([jiro]);

      await user.type(amountInput('佐藤次郎'), '1000');
      await user.click(screen.getByRole('button', { name: '請求' }));

      expect(
        await screen.findByText('佐藤次郎さんに1,000円を請求しました。'),
      ).toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/payment-requests',
        expect.objectContaining({
          body: JSON.stringify({
            requests: [{ recipientId: jiro.id, amount: 1000 }],
          }),
        }),
      );
    });

    it('請求者IDはbackendのcurrent userで決まるため、リクエストボディへ含めない', async () => {
      const fetchMock = vi.mocked(fetch);
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 201 }));

      const user = userEvent.setup();
      renderWithRecipients([jiro, saburo]);

      await user.type(amountInput('佐藤次郎'), '1000');
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
        renderWithRecipients([jiro]);

        await user.type(amountInput('佐藤次郎'), '1000');
        await user.click(screen.getByRole('button', { name: '請求' }));

        expect(
          await screen.findByText(
            '請求に失敗しました。時間をおいて再度お試しください。',
          ),
        ).toBeInTheDocument();
      },
    );
  });

  // backendは1リクエスト50件までしか受け付けない（MAX_REQUESTS_PER_CALL）。
  it('51人以上が渡された場合は送信できない', () => {
    const tooMany = Array.from({ length: 51 }, (_, index) => ({
      id: `5e5a4a1e-3b42-4f47-8b1f-b77ef98b${String(index).padStart(4, '0')}`,
      name: `テスト${index}`,
    }));
    renderWithRecipients(tooMany);

    expect(
      screen.getByText(
        '一度に請求できるのは50人までです。相手を選び直してください。',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '請求' })).toBeDisabled();
  });
});
