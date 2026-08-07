import { Link } from 'react-router-dom';

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
 * 決着していない請求だけ、確認画面へのリンクにする（Issue #61）。
 */
export function PaymentRequestListItem({
  request,
  direction,
  showStatus = false,
}: PaymentRequestListItemProps) {
  const { counterparty, amount, createdAt } = request;
  // 決着していないものだけ操作できる。済んだものは開いてもできることがない。
  const isActionable = request.status === 'pending';
  const body = (
    <>
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
      {/*
        押せない行でも同じ幅を確保する。「›」の有無で金額の右端がずれると、
        一覧で金額を目で追いにくくなるため。
      */}
      <span aria-hidden="true" className="w-2 flex-none text-slate-400">
        {isActionable ? '›' : ''}
      </span>
    </>
  );
  const rowStyle =
    'flex min-h-[76px] items-center gap-3.5 border-b border-slate-100 px-5 py-3';

  // 押せる行だけLinkにする。divにonClickを付けるとキーボードで操作できない。
  return isActionable ? (
    <li>
      <Link
        to={`/payment-requests/${request.id}?direction=${direction}`}
        className={`${rowStyle} active:bg-slate-50`}
      >
        {body}
      </Link>
    </li>
  ) : (
    <li className={rowStyle}>{body}</li>
  );
}
