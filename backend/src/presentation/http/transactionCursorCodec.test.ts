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
});
