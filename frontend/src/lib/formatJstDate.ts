// 日本国内向けのため表示はJST固定。実行環境のタイムゾーンに依存させない。
const formatter = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** JSTへ変換した日時の各成分。解釈できない値ならnull。 */
export interface JstDateParts {
  month: string;
  day: string;
  hour: string;
  minute: string;
}

/**
 * ISO 8601の日時をJSTの成分へ分解する。
 * 何をどう並べるかは呼び出し側が決める（取引履歴は時刻まで、請求は月日だけ）。
 */
export function toJstDateParts(isoDateTime: string): JstDateParts | null {
  const date = new Date(isoDateTime);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  // ja-JPのフォーマットは「2026/8/5 14:30」形式のため、成分を取り出して組み立てる。
  const parts = formatter.formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';

  return {
    month: pick('month'),
    day: pick('day'),
    hour: pick('hour'),
    minute: pick('minute'),
  };
}
