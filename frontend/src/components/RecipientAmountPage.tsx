import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { Recipient } from '../types/user';
import { UserAvatar } from './UserAvatar';

export interface MaxAmountConfig {
  value: number;
  label: string;
  exceededMessage: string;
}

export interface RecipientAmountPageProps {
  recipient: Recipient;
  heading: string;
  amountLabel: string;
  submitLabel: string;
  submittingLabel: string;
  submitErrorMessage: string;
  completeTitle: string;
  renderCompleteDescription: (recipient: Recipient, amount: number) => string;
  onSubmit: (amount: number) => Promise<void>;
  maxAmount?: MaxAmountConfig;
  showMessageField?: boolean;
}

// 送金画面・請求画面共通の「相手表示＋金額入力＋バリデーション＋送信＋完了表示」UI。
// 差分（ラベル文言・送金上限額チェックの要否・メッセージ欄の要否・送信処理・完了メッセージ）はpropsで切り替える。
export function RecipientAmountPage({
  recipient,
  heading,
  amountLabel,
  submitLabel,
  submittingLabel,
  submitErrorMessage,
  completeTitle,
  renderCompleteDescription,
  onSubmit,
  maxAmount,
  showMessageField = false,
}: RecipientAmountPageProps) {
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submittedAmount, setSubmittedAmount] = useState(0);

  const numericAmount = Number(amount);
  const isSafeAmount = Number.isSafeInteger(numericAmount);
  const errorMessage =
    amount !== '' && !isSafeAmount
      ? '入力できる金額の桁数を超えています'
      : maxAmount !== undefined &&
          amount !== '' &&
          numericAmount > maxAmount.value
        ? maxAmount.exceededMessage
        : '';
  const canSubmit =
    amount !== '' && isSafeAmount && numericAmount > 0 && errorMessage === '';

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value === '' || /^[0-9]+$/.test(value)) {
      setAmount(value);
    }
  };

  const handleSubmit = async () => {
    const amountToSubmit = numericAmount;
    setSubmitError('');
    setIsSubmitting(true);
    try {
      await onSubmit(amountToSubmit);
      setSubmittedAmount(amountToSubmit);
      setIsSent(true);
    } catch {
      setSubmitError(submitErrorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSent) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-6 bg-slate-50 px-5 py-8 text-center">
        <p className="text-lg font-bold text-slate-900">{completeTitle}</p>
        <p className="text-sm text-slate-600">
          {renderCompleteDescription(recipient, submittedAmount)}
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
      <h1 className="text-lg font-bold text-slate-900">{heading}</h1>

      <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <UserAvatar name={recipient.name} profileUrl={recipient.profileUrl} />
        <span className="text-base font-medium text-slate-800">
          {recipient.name}
        </span>
      </div>

      {maxAmount !== undefined && (
        <div>
          <p className="text-sm font-semibold text-slate-600">
            {maxAmount.label}
          </p>
          <p className="mt-1 text-base text-slate-900">
            {maxAmount.value.toLocaleString()}円
          </p>
        </div>
      )}

      <div>
        <label
          htmlFor="amount"
          className="text-sm font-semibold text-slate-600"
        >
          {amountLabel}
        </label>
        <div className="mt-2 flex items-center rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-sm focus-within:border-blue-400">
          <input
            id="amount"
            type="text"
            inputMode="numeric"
            placeholder="金額"
            value={amount}
            onChange={handleAmountChange}
            disabled={isSubmitting}
            className="w-full text-right text-2xl font-semibold text-slate-900 outline-none disabled:opacity-60"
          />
          <span className="ml-2 text-lg text-slate-600">円</span>
        </div>
        {errorMessage !== '' && (
          <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
        )}
      </div>

      {showMessageField && (
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
            disabled={isSubmitting}
            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-400 disabled:opacity-60"
          />
        </div>
      )}

      {submitError !== '' && (
        <p className="text-sm text-red-600">{submitError}</p>
      )}

      <button
        type="button"
        disabled={!canSubmit || isSubmitting}
        onClick={() => void handleSubmit()}
        className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {isSubmitting ? submittingLabel : submitLabel}
      </button>
    </div>
  );
}
