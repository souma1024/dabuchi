import type { PaymentRequestDirection, PaymentRequestStatus } from '../types';

/**
 * 同じ状態でも、自分が請求された側か請求した側かで意味が変わる。
 * 例: accepted は受けた側なら「支払済」、出した側なら「受取済」。
 *
 * rejectedは「被請求者が拒否した」と「請求者が取り下げた」の両方を表すため、
 * statusだけでは決められない。endedByMe（Issue #135）と合わせて出し分ける。
 */
const labels: Record<
  PaymentRequestDirection,
  Record<PaymentRequestStatus, string>
> = {
  received: {
    pending: '未払い',
    accepted: '支払済',
    // rejectedの実際の表示はendedByMeで決まる。ここは判別できなかったときの控え。
    rejected: 'キャンセル',
  },
  sent: {
    pending: '請求中',
    accepted: '受取済',
    rejected: 'キャンセル',
  },
};

/**
 * 決着済みのrejectedを、行為者ではなく「行われた操作」で表す。
 *
 * 拒否できるのは被請求者、取り下げられるのは請求者だけなので、操作名を出せば
 * 誰がやったかは一意に決まる。「相手が」「自分が」と書き分けるより短く済む。
 */
function endedLabel(
  direction: PaymentRequestDirection,
  endedByMe: boolean,
): string {
  const endedByRecipient = direction === 'received' ? endedByMe : !endedByMe;

  return endedByRecipient ? '拒否' : '取り下げ';
}

interface PaymentRequestStatusBadgeProps {
  direction: PaymentRequestDirection;
  status: PaymentRequestStatus;
  /** 決着させたのが自分か。pendingのあいだはnull。 */
  endedByMe: boolean | null;
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
  endedByMe,
}: PaymentRequestStatusBadgeProps) {
  const style = badgeStyle(direction, status);
  // endedByMeが欠けた場合だけ、行為者を示さない従来の言い方へ落とす。
  const label =
    status === 'rejected' && endedByMe !== null
      ? endedLabel(direction, endedByMe)
      : labels[direction][status];

  return (
    <span
      className={`flex-none rounded border px-1.5 py-px text-[10px] font-bold ${style}`}
    >
      {label}
    </span>
  );
}
