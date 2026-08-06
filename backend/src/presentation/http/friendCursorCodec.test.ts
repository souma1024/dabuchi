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

  // 形式だけを見ると通ってしまう日時。MySQLへ渡すと500になるため、ここで弾く。
  it.each([
    '2026-99-99 99:99:99',
    '2026-02-30 00:00:00',
    '2026-13-01 00:00:00',
    '2026-08-06 24:00:00',
    '2026-08-06 12:60:00',
    '2026-08-06 12:00:60',
  ])('実在しない日時の友達一覧カーソルを拒否する: %s', (createdAt) => {
    const cursor = encodeFriendCursor({
      createdAt,
      id: '00000000-0000-4000-8000-000000000020',
    });

    expect(decodeFriendCursor(cursor)).toBeNull();
  });

  it.each([
    '2024-02-29 00:00:00',
    '2026-12-31 23:59:59',
    '2026-08-06 12:00:20.000000',
  ])(
    '実在する境界の日時は友達一覧カーソルとして受け入れる: %s',
    (createdAt) => {
      const cursor = { createdAt, id: '00000000-0000-4000-8000-000000000020' };

      expect(decodeFriendCursor(encodeFriendCursor(cursor))).toEqual(cursor);
    },
  );

  it.each([
    'not-json',
    Buffer.from('{}').toString('base64url'),
    Buffer.from(
      JSON.stringify({ blockedAt: 'invalid', friendshipId: 'invalid' }),
    ).toString('base64url'),
  ])('不正なブロック一覧カーソルを拒否する: %s', (cursor) => {
    expect(decodeBlockedFriendCursor(cursor)).toBeNull();
  });

  it.each([
    '2026-99-99 99:99:99',
    '2026-02-30 00:00:00',
    '2026-13-01 00:00:00',
    '2026-08-06 24:00:00',
    '2026-08-06 12:60:00',
    '2026-08-06 12:00:60',
  ])('実在しない日時のブロック一覧カーソルを拒否する: %s', (blockedAt) => {
    const cursor = encodeBlockedFriendCursor({
      blockedAt,
      friendshipId: '10000000-0000-4000-8000-000000000020',
    });

    expect(decodeBlockedFriendCursor(cursor)).toBeNull();
  });

  it.each([
    '2024-02-29 00:00:00',
    '2026-12-31 23:59:59',
    '2026-08-06 13:00:20.000000',
  ])(
    '実在する境界の日時はブロック一覧カーソルとして受け入れる: %s',
    (blockedAt) => {
      const cursor = {
        blockedAt,
        friendshipId: '10000000-0000-4000-8000-000000000020',
      };

      expect(
        decodeBlockedFriendCursor(encodeBlockedFriendCursor(cursor)),
      ).toEqual(cursor);
    },
  );
});
