// Converts a MySQL DATETIME(6) string (in UTC) such as
// '2026-08-05 01:00:00.000000' into an ISO 8601 string
// '2026-08-05T01:00:00.000Z'. Stored timestamps are treated as UTC.
export function mysqlDateTimeToIso(value: string): string {
  const [datePart = '', timePart = ''] = value.split(' ');
  const [clock = '', fraction = ''] = timePart.split('.');
  const milliseconds = `${fraction}000`.slice(0, 3);

  return `${datePart}T${clock}.${milliseconds}Z`;
}
