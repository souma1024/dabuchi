import { UserAvatar } from '../../../components/UserAvatar';
import { getAmountError, isAmountInputValue } from '../../../lib/amount';
import type { Recipient } from '../../../types/user';

interface BillingRecipientRowProps {
  recipient: Recipient;
  amount: string;
  disabled: boolean;
  onAmountChange: (value: string) => void;
}

/**
 * 請求先一覧の1行。相手の顔写真・氏名と、その相手への請求金額入力欄を並べる。
 * 氏名が入力欄のラベルになるため、支援技術でも「誰にいくら」が対応付く。
 */
export function BillingRecipientRow({
  recipient,
  amount,
  disabled,
  onAmountChange,
}: BillingRecipientRowProps) {
  const inputId = `billing-amount-${recipient.id}`;
  const errorId = `${inputId}-error`;
  const errorMessage = getAmountError(amount);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (isAmountInputValue(value)) {
      onAmountChange(value);
    }
  };

  return (
    <li className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <UserAvatar name={recipient.name} profileUrl={recipient.profileUrl} />
        <label
          htmlFor={inputId}
          className="min-w-0 flex-1 truncate text-base font-medium text-slate-800"
        >
          {recipient.name}
        </label>
        <div className="flex w-36 flex-none items-center rounded-xl border border-slate-300 px-3 py-2 focus-within:border-blue-400">
          <input
            id={inputId}
            type="text"
            inputMode="numeric"
            placeholder="金額"
            value={amount}
            onChange={handleChange}
            disabled={disabled}
            aria-invalid={errorMessage !== ''}
            aria-describedby={errorMessage !== '' ? errorId : undefined}
            className="w-full min-w-0 text-right text-lg font-semibold text-slate-900 outline-none disabled:opacity-60"
          />
          <span className="ml-1 flex-none text-sm text-slate-600">円</span>
        </div>
      </div>
      {errorMessage !== '' && (
        <p id={errorId} className="mt-2 text-right text-sm text-red-600">
          {errorMessage}
        </p>
      )}
    </li>
  );
}
