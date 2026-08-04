import { describe, expect, it } from 'vitest';

import {
  decodeRecipientCursor,
  encodeRecipientCursor,
} from './recipientCursorCodec.js';

describe('recipient cursor codec', () => {
  it('カーソルをbase64urlへ変換して復元する', () => {
    const cursor = {
      createdAt: '2026-08-04 12:00:20.000000',
      id: '00000000-0000-4000-8000-000000000020',
    };

    expect(decodeRecipientCursor(encodeRecipientCursor(cursor))).toEqual(
      cursor,
    );
  });

  it.each(['not-json', Buffer.from('{}').toString('base64url')])(
    '不正なカーソルを拒否する: %s',
    (cursor) => {
      expect(decodeRecipientCursor(cursor)).toBeNull();
    },
  );
});
