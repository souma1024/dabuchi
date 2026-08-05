import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { UserAvatar } from '../../../components/UserAvatar';
import { currentUser, recipients } from '../../../lib/mockUsers';
import type { Recipient as TransferRecipient } from '../../../types/user';
import { sendTransfer } from '../api/transferClient';

interface TransferLocationState {
  recipient: TransferRecipient;
}

function isTransferRecipient(value: unknown): value is TransferRecipient {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { id?: unknown }).id === 'string' &&
    typeof (value as { name?: unknown }).name === 'string'
  );
}

function isTransferLocationState(
  state: unknown,
): state is TransferLocationState {
  return (
    typeof state === 'object' &&
    state !== null &&
    'recipient' in state &&
    isTransferRecipient((state as { recipient?: unknown }).recipient)
  );
}

// 送金相手の選択画面は別担当が実装するため、遷移元から渡されなかった場合はモックの相手にフォールバックする。
const defaultRecipient: TransferRecipient = recipients[0] ?? currentUser;

export function TransferAmountPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const recipient = isTransferLocationState(location.state)
    ? location.state.recipient
    : defaultRecipient;
  const numericAmount = Number(amount);
  const errorMessage =
    amount !== '' && numericAmount > currentUser.zandaka
      ? '送金上限額を超えています'
      : '';
  const canSubmit = amount !== '' && numericAmount > 0 && errorMessage === '';

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value === '' || /^[0-9]+$/.test(value)) {
      setAmount(value);
    }
  };

  const handleSubmit = async () => {
    setSubmitError('');
    setIsSubmitting(true);
    try {
      await sendTransfer({ userId: recipient.id, amount: numericAmount });
      setIsSent(true);
    } catch {
      setSubmitError('送金に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSent) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-6 bg-slate-50 px-5 py-8 text-center">
        <p className="text-lg font-bold text-slate-900">送金が完了しました</p>
        <p className="text-sm text-slate-600">
          {recipient.name}さんに{numericAmount.toLocaleString()}
          円を送金しました。
        </p>
        <button
          type="button"
          onClick={() => void navigate('/')}
          className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          トップへ戻る
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-6 bg-slate-50 px-5 py-8">
      <h1 className="text-lg font-bold text-slate-900">送金先</h1>

      <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <UserAvatar name={recipient.name} profileUrl={recipient.profileUrl} />
        <span className="text-base font-medium text-slate-800">
          {recipient.name}
        </span>
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-600">送金上限額</p>
        <p className="mt-1 text-base text-slate-900">
          {currentUser.zandaka.toLocaleString()}円
        </p>
      </div>

      <div>
        <label
          htmlFor="amount"
          className="text-sm font-semibold text-slate-600"
        >
          送金金額
        </label>
        <div className="mt-2 flex items-center rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-sm focus-within:border-blue-400">
          <input
            id="amount"
            type="text"
            inputMode="numeric"
            placeholder="金額"
            value={amount}
            onChange={handleAmountChange}
            className="w-full text-right text-2xl font-semibold text-slate-900 outline-none"
          />
          <span className="ml-2 text-lg text-slate-600">円</span>
        </div>
        {errorMessage !== '' && (
          <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="message"
          className="text-sm font-semibold text-slate-600"
        >
          メッセージ（任意）
        </label>
        <textarea
          id="message"
          placeholder="メッセージ"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={3}
          className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-400"
        />
      </div>

      {submitError !== '' && (
        <p className="text-sm text-red-600">{submitError}</p>
      )}

      <button
        type="button"
        disabled={!canSubmit || isSubmitting}
        onClick={() => void handleSubmit()}
        className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {isSubmitting ? '送信中...' : '送金'}
      </button>
    </div>
  );
}
