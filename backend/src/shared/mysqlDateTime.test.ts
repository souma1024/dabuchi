import { describe, expect, it } from 'vitest';

import { mysqlDateTimeToIso } from './mysqlDateTime.js';

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
