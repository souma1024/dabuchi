import { toJstDateParts } from '../../lib/formatJstDate';

/**
 * ISO 8601の請求日時を「8/3」形式にする。
 * 取引履歴と違い時刻は出さない。ホーム画面では「いつの請求か」が分かれば足りるため。
 * 開催期間内に年をまたがないため年は表示しない。
 */
export function formatPaymentRequestDate(isoDateTime: string): string {
  const parts = toJstDateParts(isoDateTime);

  return parts === null ? '' : `${parts.month}/${parts.day}`;
}
