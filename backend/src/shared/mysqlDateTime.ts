// Converts a MySQL DATETIME(6) string (in UTC) such as
// '2026-08-05 01:00:00.000000' into an ISO 8601 string
// '2026-08-05T01:00:00.000Z'. Stored timestamps are treated as UTC.
export function mysqlDateTimeToIso(value: string): string {
  const [datePart = '', timePart = ''] = value.split(' ');
  const [clock = '', fraction = ''] = timePart.split('.');
  const milliseconds = `${fraction}000`.slice(0, 3);

  return `${datePart}T${clock}.${milliseconds}Z`;
}

const MYSQL_DATETIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?$/;

// 形式だけでなく、実在するカレンダー日時であることを検証する。
// 2026-99-99 99:99:99 や 2026-02-30 のような値を弾き、不正カーソルを400に導く。
export function isRealMysqlDateTime(value: string): boolean {
  const match = MYSQL_DATETIME_PATTERN.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

  // 存在しない月/日/時刻はDateが桁上がりで正規化されるため、成分の一致で検出する。
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getUTCHours() === hour &&
    date.getUTCMinutes() === minute &&
    date.getUTCSeconds() === second
  );
}
