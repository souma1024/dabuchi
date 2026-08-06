import { describe, expect, it } from 'vitest';

import {
  decodeBlockedFriendCursor,
  decodeFriendCursor,
  encodeBlockedFriendCursor,
  encodeFriendCursor,
} from './friendCursorCodec.js';

describe('friend cursor codec', () => {
  it('友達一覧カーソルをbase64urlへ変換して復元する', () => {
    const cursor = {
      createdAt: '2026-08-06 12:00:20.000000',
      id: '00000000-0000-4000-8000-000000000020',
    };

    expect(decodeFriendCursor(encodeFriendCursor(cursor))).toEqual(cursor);
  });

  it('ブロック一覧カーソルをbase64urlへ変換して復元する', () => {
    const cursor = {
      blockedAt: '2026-08-06 13:00:20.000000',
      friendshipId: '10000000-0000-4000-8000-000000000020',
    };

    expect(
      decodeBlockedFriendCursor(encodeBlockedFriendCursor(cursor)),
    ).toEqual(cursor);
  });

  it.each([
    'not-json',
    Buffer.from('{}').toString('base64url'),
    Buffer.from(
      JSON.stringify({ createdAt: 'invalid', id: 'invalid' }),
    ).toString('base64url'),
  ])('不正な友達一覧カーソルを拒否する: %s', (cursor) => {
    expect(decodeFriendCursor(cursor)).toBeNull();
  });

  it.each([
    'not-json',
    Buffer.from('{}').toString('base64url'),
    Buffer.from(
      JSON.stringify({ blockedAt: 'invalid', friendshipId: 'invalid' }),
    ).toString('base64url'),
  ])('不正なブロック一覧カーソルを拒否する: %s', (cursor) => {
    expect(decodeBlockedFriendCursor(cursor)).toBeNull();
  });
});
