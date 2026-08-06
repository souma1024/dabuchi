import { describe, expect, it } from 'vitest';

import {
  decodeRecipientCursor,
  encodeRecipientCursor,
} from './recipientCursorCodec.js';

describe('recipient cursor codec', () => {
  it('カーソルをbase64urlへ変換して復元する', () => {
    const cursor = {
      sort: 'created-asc' as const,
      value: {
        createdAt: '2026-08-04 12:00:20.000000',
        id: '00000000-0000-4000-8000-000000000020',
      },
    };

    expect(decodeRecipientCursor(encodeRecipientCursor(cursor))).toEqual(
      cursor,
    );
  });

  it('name-ascカーソルをbase64urlへ変換して復元する', () => {
    const cursor = {
      sort: 'name-asc' as const,
      value: {
        name: '佐藤 花子',
        id: '00000000-0000-4000-8000-000000000020',
      },
    };

    expect(decodeRecipientCursor(encodeRecipientCursor(cursor))).toEqual(
      cursor,
    );
  });

  it.each([
    'not-json',
    Buffer.from('{}').toString('base64url'),
    Buffer.from(
      JSON.stringify({
        sort: 'name-asc',
        value: { createdAt: '2026-08-04 12:00:20.000000', id: 'x' },
      }),
    ).toString('base64url'),
  ])(
    '不正なカーソルを拒否する: %s',
    (cursor) => {
      expect(decodeRecipientCursor(cursor)).toBeNull();
    },
  );
});
