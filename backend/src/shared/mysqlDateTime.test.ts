import { describe, expect, it } from 'vitest';

import { isRealMysqlDateTime, mysqlDateTimeToIso } from './mysqlDateTime.js';

describe('isRealMysqlDateTime', () => {
  it.each([
    '2026-08-05 01:00:00',
    '2026-08-05 01:00:00.123456',
    '2024-02-29 00:00:00',
    '2026-12-31 23:59:59',
  ])('実在する日時を受け入れる: %s', (value) => {
    expect(isRealMysqlDateTime(value)).toBe(true);
  });

  it.each([
    '2026-99-99 99:99:99',
    '2026-02-30 00:00:00',
    '2025-02-29 00:00:00',
    '2026-13-01 00:00:00',
    '2026-08-05 24:00:00',
    '2026-08-05T01:00:00',
    '',
  ])('実在しない日時や形式違いを拒否する: %s', (value) => {
    expect(isRealMysqlDateTime(value)).toBe(false);
  });
});

describe('mysqlDateTimeToIso', () => {
  it('MySQLのDATETIME(6)文字列をISO 8601(UTC)へ変換する', () => {
    expect(mysqlDateTimeToIso('2026-08-05 01:00:00.000000')).toBe(
      '2026-08-05T01:00:00.000Z',
    );
  });

  it('マイクロ秒をミリ秒3桁へ丸める', () => {
    expect(mysqlDateTimeToIso('2026-08-05 01:00:00.123456')).toBe(
      '2026-08-05T01:00:00.123Z',
    );
  });

  it('小数秒がなければミリ秒を000で補う', () => {
    expect(mysqlDateTimeToIso('2026-08-05 01:00:00')).toBe(
      '2026-08-05T01:00:00.000Z',
    );
  });
});
