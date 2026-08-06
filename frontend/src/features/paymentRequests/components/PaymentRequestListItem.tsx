import { UserAvatar } from '../../../components/UserAvatar';
import { formatPaymentRequestDate } from '../formatPaymentRequestDate';
import type { PaymentRequest } from '../types';

interface PaymentRequestListItemProps {
  request: PaymentRequest;
}

/**
 * 請求の1行。相手のアイコン・氏名・請求日・金額を表示する。
 * 承認画面（Issue #61）が未実装のため、現時点では行をタップできない。
 */
export function PaymentRequestListItem({
  request,
}: PaymentRequestListItemProps) {
  const { counterparty, amount, createdAt } = request;

  return (
    <li className="flex min-h-[76px] items-center gap-3.5 border-b border-slate-100 px-5 py-3">
      <UserAvatar
        name={counterparty.name}
        profileUrl={counterparty.profileUrl}
      />
      <div className="min-w-0 flex-1">
        <span className="block min-w-0 truncate text-[15px] font-semibold text-slate-800">
          {counterparty.name}
        </span>
        <span className="mt-0.5 block text-xs text-slate-500">
          {formatPaymentRequestDate(createdAt)}
        </span>
      </div>
      {/* 自分が払う側なので、送金と同じ赤で「出ていくお金」であることを示す。 */}
      <span className="flex-none text-[15px] font-bold text-red-700">
        {amount.toLocaleString()}円
      </span>
    </li>
  );
}
