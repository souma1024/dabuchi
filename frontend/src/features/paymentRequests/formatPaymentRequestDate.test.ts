import { describe, expect, it } from 'vitest';

import { formatPaymentRequestDate } from './formatPaymentRequestDate';

describe('formatPaymentRequestDate', () => {
  it('UTCの日時をJSTの月日にする', () => {
    // 2026-08-03T01:00:00Z は JST では 8/3 10:00。
    expect(formatPaymentRequestDate('2026-08-03T01:00:00.000Z')).toBe('8/3');
  });

  // JSTはUTC+9のため、UTCで前日15時以降は翌日になる。
  it('UTCとJSTで日付がまたぐ場合もJSTで判定する', () => {
    expect(formatPaymentRequestDate('2026-08-02T15:00:00.000Z')).toBe('8/3');
  });

  it('月initialのゼロ埋めをしない', () => {
    expect(formatPaymentRequestDate('2026-01-05T00:00:00.000Z')).toBe('1/5');
  });

  it('解釈できない値は空文字にする', () => {
    expect(formatPaymentRequestDate('not-a-date')).toBe('');
  });
});
