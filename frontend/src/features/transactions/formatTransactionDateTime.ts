// 日本国内向けのため表示はJST固定。実行環境のタイムゾーンに依存させない。
const formatter = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * ISO 8601の取引日時を「8/5 14:30」形式にする。
 * 開催期間内に年をまたがないため年は表示しない。
 */
export function formatTransactionDateTime(isoDateTime: string): string {
  const date = new Date(isoDateTime);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  // ja-JPのフォーマットは「2026/8/5 14:30」形式のため、年を落として結合する。
  const parts = formatter.formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';

  return `${pick('month')}/${pick('day')} ${pick('hour')}:${pick('minute')}`;
}
