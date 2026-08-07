import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  getAmountError,
  isAmountInputValue,
  isSubmittableAmount,
} from '../lib/amount';
import type { Recipient } from '../types/user';
import { ScreenHeader } from './ScreenHeader';
import { UserAvatar } from './UserAvatar';

export interface MaxAmountConfig {
  value: number;
  label: string;
  exceededMessage: string;
}

export interface RecipientAmountPageProps {
  recipient: Recipient;
  /** ヘッダー中央に表示する画面名。 */
  heading: string;
  amountLabel: string;
  submitLabel: string;
  submittingLabel: string;
  submitErrorMessage: string;
  completeTitle: string;
  renderCompleteDescription: (recipient: Recipient, amount: number) => string;
  /** 完了メッセージの下に補足として表示する（例: 残高反映が別処理であることの注記）。未指定なら表示しない。 */
  completeNote?: string;
  onSubmit: (amount: number) => Promise<void>;
  maxAmount?: MaxAmountConfig;
  /**
   * ラベルには表示しない追加の上限。maxAmountの範囲内でも、これを超える金額は送信できない。
   * 送金画面で「上限額（80,000円）は満たすが口座残高が足りない」ケースを、上限額とは別の
   * メッセージ（残高不足）で示すために使う。
   */
  secondaryMax?: { value: number; exceededMessage: string };
  /** ヘッダー左上の戻る操作。未指定なら戻るボタンは表示しない。 */
  onBack?: () => void;
}

// 送金画面・請求画面共通の「相手表示＋金額入力＋バリデーション＋送信＋完了表示」UI。
// 差分（ラベル文言・送金上限額チェックの要否・送信処理・完了メッセージ）はpropsで切り替える。
//
// メッセージ欄は設けていない。transfers・payment_requestsのどちらのテーブルにもmessage列が無く、
// APIも受け付けないため、入力させても送信されず破棄されるだけになる。
// backendが対応したらonSubmitへmessageを渡す形で追加する。
export function RecipientAmountPage({
  recipient,
  heading,
  amountLabel,
  submitLabel,
  submittingLabel,
  submitErrorMessage,
  completeTitle,
  renderCompleteDescription,
  completeNote,
  onSubmit,
  maxAmount,
  secondaryMax,
  onBack,
}: RecipientAmountPageProps) {
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submittedAmount, setSubmittedAmount] = useState(0);

  const numericAmount = Number(amount);
  const amountError = getAmountError(amount);
  // 表示する上限（maxAmount。送金なら80,000円）を超えたらそのメッセージを最優先で示す。
  // 次に、ラベルには出さない追加の上限（secondaryMax。送金の残高ガード）。桁数・全体上限
  // などの共通エラーはそれらの内側で扱う。
  const errorMessage =
    maxAmount !== undefined && amount !== '' && numericAmount > maxAmount.value
      ? maxAmount.exceededMessage
      : secondaryMax !== undefined &&
          amount !== '' &&
          numericAmount > secondaryMax.value
        ? secondaryMax.exceededMessage
        : amountError;
  const canSubmit = isSubmittableAmount(amount) && errorMessage === '';

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (isAmountInputValue(value)) {
      setAmount(value);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }
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
        {completeNote !== undefined && (
          <p className="text-sm text-slate-500">{completeNote}</p>
        )}
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
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-slate-50">
      <ScreenHeader title={heading} onBack={onBack} />

      <div className="flex flex-1 flex-col gap-6 px-5 py-8">
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
    </div>
  );
}
