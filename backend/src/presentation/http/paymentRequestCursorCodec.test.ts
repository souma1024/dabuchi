import { describe, expect, it } from 'vitest';

import {
  decodePaymentRequestCursor,
  encodePaymentRequestCursor,
} from './paymentRequestCursorCodec.js';

const VALID_CURSOR = {
  createdAt: '2026-08-04 12:00:20.000000',
  id: '00000000-0000-4000-8000-000000000020',
};

function encodeRaw(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

describe('payment request cursor codec', () => {
  it('カーソルをbase64urlへ変換して復元する', () => {
    expect(
      decodePaymentRequestCursor(encodePaymentRequestCursor(VALID_CURSOR)),
    ).toEqual(VALID_CURSOR);
  });

  it('秒の小数部がなくても受け付ける', () => {
    const cursor = { ...VALID_CURSOR, createdAt: '2026-08-04 12:00:20' };

    expect(decodePaymentRequestCursor(encodeRaw(cursor))).toEqual(cursor);
  });

  it.each([
    ['base64urlでない', 'not-json'],
    ['項目が足りない', encodeRaw({})],
    ['createdAtだけある', encodeRaw({ createdAt: VALID_CURSOR.createdAt })],
    ['idだけある', encodeRaw({ id: VALID_CURSOR.id })],
    ['idが文字列でない', encodeRaw({ ...VALID_CURSOR, id: 20 })],
    // payment_requests.id はBINARY(16)のUUID。取引履歴と違い連番ではない。
    ['idがUUIDでない', encodeRaw({ ...VALID_CURSOR, id: '20' })],
    [
      'createdAtの形式が違う',
      encodeRaw({ ...VALID_CURSOR, createdAt: '2026/08/04 12:00:20' }),
    ],
    // Buffer.from(..., 'base64url') は文字集合外の文字を読み飛ばすため、
    // 検証しないと改竄された値がそのまま通ってしまう。
    [
      '正しいカーソルの末尾に非base64url文字がある',
      `${encodeRaw(VALID_CURSOR)}!`,
    ],
    ['paddingが付いている', `${encodeRaw(VALID_CURSOR)}==`],
  ])('不正なカーソルを拒否する: %s', (_name, cursor) => {
    expect(decodePaymentRequestCursor(cursor)).toBeNull();
  });

  it.each([
    '2026-13-01 00:00:00.000000', // 月が不正
    '2026-00-01 00:00:00.000000', // 月が不正(0)
    '2026-02-30 00:00:00.000000', // 日が不正(2月30日)
    '2026-08-05 24:00:00.000000', // 時が不正
    '2026-08-05 00:60:00.000000', // 分が不正
    '2026-08-05 00:00:60.000000', // 秒が不正
  ])('実在しない日時のカーソルを拒否する: %s', (createdAt) => {
    expect(
      decodePaymentRequestCursor(encodeRaw({ ...VALID_CURSOR, createdAt })),
    ).toBeNull();
  });
});
