import { describe, expect, it } from 'vitest';

import {
  decodeTransactionCursor,
  encodeTransactionCursor,
} from './transactionCursorCodec.js';

describe('transaction cursor codec', () => {
  it('カーソルをbase64urlへ変換して復元する', () => {
    const cursor = {
      createdAt: '2026-08-04 12:00:20.000000',
      id: '20',
    };

    expect(decodeTransactionCursor(encodeTransactionCursor(cursor))).toEqual(
      cursor,
    );
  });

  it.each([
    'not-json',
    Buffer.from('{}').toString('base64url'),
    // id が数値文字列でない(UUID)カーソルは拒否する
    Buffer.from(
      JSON.stringify({
        createdAt: '2026-08-04 12:00:20.000000',
        id: '00000000-0000-4000-8000-000000000020',
      }),
    ).toString('base64url'),
  ])('不正なカーソルを拒否する: %s', (cursor) => {
    expect(decodeTransactionCursor(cursor)).toBeNull();
  });

  it.each([
    '2026-13-01 00:00:00.000000', // 月が不正
    '2026-00-01 00:00:00.000000', // 月が不正(0)
    '2026-02-30 00:00:00.000000', // 日が不正(2月30日)
    '2026-08-05 24:00:00.000000', // 時が不正
    '2026-08-05 00:60:00.000000', // 分が不正
    '2026-08-05 00:00:60.000000', // 秒が不正
  ])('実在しない日時のカーソルを拒否する: %s', (createdAt) => {
    const encoded = Buffer.from(
      JSON.stringify({ createdAt, id: '20' }),
    ).toString('base64url');

    expect(decodeTransactionCursor(encoded)).toBeNull();
  });
});
