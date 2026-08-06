import { UserAvatar } from '../../../components/UserAvatar';
import { formatPaymentRequestDate } from '../formatPaymentRequestDate';
import type { PaymentRequest, PaymentRequestDirection } from '../types';
import { PaymentRequestStatusBadge } from './PaymentRequestStatusBadge';

// 決着していないものだけ濃く出し、済んだものは薄くして視線が向かないようにする。
// 自分が払う（received × pending）だけ、送金と同じ赤で「出ていくお金」を示す。
function amountStyle(
  direction: PaymentRequestDirection,
  request: PaymentRequest,
): string {
  if (request.status !== 'pending') {
    return 'text-slate-400';
  }

  return direction === 'received' ? 'text-red-700' : 'text-slate-800';
}

interface PaymentRequestListItemProps {
  request: PaymentRequest;
  direction: PaymentRequestDirection;
  /** 履歴のように決着済みが混ざる一覧で状態バッジを出す。 */
  showStatus?: boolean;
}

/**
 * 請求の1行。相手のアイコン・氏名・請求日・金額を表示する。
 * 承認画面（Issue #61）が未実装のため、現時点では行をタップできない。
 */
export function PaymentRequestListItem({
  request,
  direction,
  showStatus = false,
}: PaymentRequestListItemProps) {
  const { counterparty, amount, createdAt } = request;

  return (
    <li className="flex min-h-[76px] items-center gap-3.5 border-b border-slate-100 px-5 py-3">
      <UserAvatar
        name={counterparty.name}
        profileUrl={counterparty.profileUrl}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {showStatus && (
            <PaymentRequestStatusBadge
              direction={direction}
              status={request.status}
            />
          )}
          <span className="min-w-0 truncate text-[15px] font-semibold text-slate-800">
            {counterparty.name}
          </span>
        </div>
        <span className="mt-0.5 block text-xs text-slate-500">
          {formatPaymentRequestDate(createdAt)}
        </span>
      </div>
      <span
        className={`flex-none text-[15px] font-bold ${amountStyle(direction, request)}`}
      >
        {amount.toLocaleString()}円
      </span>
    </li>
  );
}
