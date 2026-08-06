import type { PaymentRequestDirection, PaymentRequestStatus } from '../types';

/**
 * 同じ状態でも、自分が請求された側か請求した側かで意味が変わる。
 * 例: accepted は受けた側なら「支払済」、出した側なら「受取済」。
 *
 * rejectedは「被請求者が拒否した」と「請求者が取り消した」の両方を表す。
 * DBが誰の行為かを持たないため、ラベルも行為者を示さない「キャンセル」にする。
 * 「拒否した」と出すと、相手が取り消した場合に事実と食い違う。
 */
const labels: Record<
  PaymentRequestDirection,
  Record<PaymentRequestStatus, string>
> = {
  received: {
    pending: '未払い',
    accepted: '支払済',
    rejected: 'キャンセル',
  },
  sent: {
    pending: '請求中',
    accepted: '受取済',
    rejected: 'キャンセル',
  },
};

interface PaymentRequestStatusBadgeProps {
  direction: PaymentRequestDirection;
  status: PaymentRequestStatus;
}

// 塗り／枠線で「決着しているか」、色で「自分が対応すべきか」を示す。
// アンバーはホーム画面の件数バッジと同じで、自分宛の未対応を指す。
// 出した請求の pending は相手待ちで自分の未対応ではないため、アンバーにしない。
function badgeStyle(
  direction: PaymentRequestDirection,
  status: PaymentRequestStatus,
): string {
  if (status !== 'pending') {
    return 'border-slate-300 bg-white text-slate-500';
  }

  return direction === 'received'
    ? 'border-amber-500 bg-amber-500 text-white'
    : 'border-slate-800 bg-slate-800 text-white';
}

/**
 * 請求の状態バッジ。
 * まだ決着していない（pending）ものだけ塗りつぶし、決着済みは枠線のみにする。
 * 塗りで区別しているため、色が判別できなくても要対応かどうかが分かる。
 */
export function PaymentRequestStatusBadge({
  direction,
  status,
}: PaymentRequestStatusBadgeProps) {
  const style = badgeStyle(direction, status);

  return (
    <span
      className={`flex-none rounded border px-1.5 py-px text-[10px] font-bold ${style}`}
    >
      {labels[direction][status]}
    </span>
  );
}
