import { describe, expect, it } from 'vitest';

import { assertUsersAreDistinct, InvalidUserBlockError } from './userBlock.js';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const FRIEND_ID = '22222222-2222-4222-8222-222222222222';

describe('assertUsersAreDistinct', () => {
  it('異なるユーザー間のブロックを許可する', () => {
    expect(() => assertUsersAreDistinct(USER_ID, FRIEND_ID)).not.toThrow();
  });

  it('自分自身のブロックを拒否する', () => {
    expect(() =>
      assertUsersAreDistinct(USER_ID, USER_ID.toUpperCase()),
    ).toThrow(InvalidUserBlockError);
  });
});
