import { toJstDateParts } from '../../lib/formatJstDate';

/**
 * ISO 8601の取引日時を「8/5 14:30」形式にする。
 * 開催期間内に年をまたがないため年は表示しない。
 */
export function formatTransactionDateTime(isoDateTime: string): string {
  const parts = toJstDateParts(isoDateTime);

  return parts === null
    ? ''
    : `${parts.month}/${parts.day} ${parts.hour}:${parts.minute}`;
}
