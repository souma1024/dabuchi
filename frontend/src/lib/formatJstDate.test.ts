import { describe, expect, it } from 'vitest';

import { formatJstDateTime } from './formatJstDate';

describe('formatJstDateTime', () => {
  it('JSTの日時を「M/D HH:MM」で表示する', () => {
    expect(formatJstDateTime('2026-08-05T14:30:00+09:00')).toBe('8/5 14:30');
  });

  it('UTC表記でもJSTへ変換して表示する', () => {
    // 2026-08-05T01:00Z は JST では同日10:00。
    expect(formatJstDateTime('2026-08-05T01:00:00.000Z')).toBe('8/5 10:00');
  });

  it('日付をまたぐUTC表記をJSTの翌日として扱う', () => {
    // 2026-08-04T20:00Z は JST では 8/5 05:00。
    expect(formatJstDateTime('2026-08-04T20:00:00.000Z')).toBe('8/5 05:00');
  });

  // 実行環境のタイムゾーンに関わらずJSTで出す。日本国内向けのため。
  it('日付が変わる境目もJSTで判定する', () => {
    // 2026-08-02T15:00Z はちょうど JST の 8/3 00:00。
    expect(formatJstDateTime('2026-08-02T15:00:00.000Z')).toBe('8/3 00:00');
  });

  // 表示が空になるだけで、画面が壊れないようにする。
  it('不正な日時は空文字を返す', () => {
    expect(formatJstDateTime('not-a-date')).toBe('');
  });
});
