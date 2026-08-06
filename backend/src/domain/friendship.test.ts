import { describe, expect, it } from 'vitest';

import { createFriendshipPair, InvalidFriendshipError } from './friendship.js';

const LOWER_USER_ID = '11111111-1111-4111-8111-111111111111';
const HIGHER_USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('createFriendshipPair', () => {
  it('内部UUIDを昇順に並べて正規化する', () => {
    expect(createFriendshipPair(HIGHER_USER_ID, LOWER_USER_ID)).toEqual({
      user1Id: LOWER_USER_ID,
      user2Id: HIGHER_USER_ID,
    });
  });

  it('UUIDの大文字小文字を同一視する', () => {
    expect(
      createFriendshipPair(LOWER_USER_ID.toUpperCase(), HIGHER_USER_ID),
    ).toEqual({
      user1Id: LOWER_USER_ID,
      user2Id: HIGHER_USER_ID,
    });
  });

  it('自分自身との友達関係を拒否する', () => {
    expect(() =>
      createFriendshipPair(LOWER_USER_ID, LOWER_USER_ID.toUpperCase()),
    ).toThrow(InvalidFriendshipError);
  });

  it('UUIDではない内部IDを拒否する', () => {
    expect(() => createFriendshipPair('friend-001', HIGHER_USER_ID)).toThrow(
      'must be a UUID',
    );
  });
});
