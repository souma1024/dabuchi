import { describe, expect, it, vi } from 'vitest';

import { createCurrentUserRepository } from '../../test/factories/currentUserRepositoryFactory.js';
import { createFriendCommandRepository } from '../../test/factories/friendCommandRepositoryFactory.js';
import type { FriendshipCommandRecord } from '../ports/friendCommandRepository.js';
import { UnblockFriend } from './unblockFriend.js';

const CURRENT_USER_PUBLIC_ID = 'friend-001';
const CURRENT_USER_INTERNAL_ID = '11111111-1111-4111-8111-111111111111';
const FRIEND_INTERNAL_ID = '22222222-2222-4222-8222-222222222222';
const FRIENDSHIP_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function createUseCase(
  blockedByCurrentUser: boolean,
  blocksCurrentUser = false,
) {
  const friendship: FriendshipCommandRecord = {
    friendshipId: FRIENDSHIP_ID,
    friendId: FRIEND_INTERNAL_ID,
    note: null,
    blockedByCurrentUser,
    blocksCurrentUser,
  };
  const friendCommandRepository = createFriendCommandRepository({
    friendship,
  });
  const useCase = new UnblockFriend(
    createCurrentUserRepository(),
    friendCommandRepository,
  );

  return { friendCommandRepository, useCase };
}

describe('UnblockFriend', () => {
  it('current userから相手へのブロックを解除する', async () => {
    const { friendCommandRepository, useCase } = createUseCase(true);

    await expect(
      useCase.execute({
        currentUserPublicId: CURRENT_USER_PUBLIC_ID,
        friendshipId: FRIENDSHIP_ID,
      }),
    ).resolves.toBeUndefined();
    expect(friendCommandRepository.unblockUser).toHaveBeenCalledWith({
      blockerId: CURRENT_USER_INTERNAL_ID,
      blockedUserId: FRIEND_INTERNAL_ID,
    });
  });

  it('未ブロックでも解除を冪等に成功させる', async () => {
    const { friendCommandRepository, useCase } = createUseCase(false);

    await expect(
      useCase.execute({
        currentUserPublicId: CURRENT_USER_PUBLIC_ID,
        friendshipId: FRIENDSHIP_ID,
      }),
    ).resolves.toBeUndefined();
    expect(friendCommandRepository.unblockUser).toHaveBeenCalledOnce();
  });

  it('相互ブロック中でも自分のブロックだけ解除する', async () => {
    const { friendCommandRepository, useCase } = createUseCase(true, true);

    await expect(
      useCase.execute({
        currentUserPublicId: CURRENT_USER_PUBLIC_ID,
        friendshipId: FRIENDSHIP_ID,
      }),
    ).resolves.toBeUndefined();
    expect(friendCommandRepository.unblockUser).toHaveBeenCalledWith({
      blockerId: CURRENT_USER_INTERNAL_ID,
      blockedUserId: FRIEND_INTERNAL_ID,
    });
  });

  it('相手からのみブロック中でも解除を冊等に成功させる', async () => {
    const { friendCommandRepository, useCase } = createUseCase(false, true);

    await expect(
      useCase.execute({
        currentUserPublicId: CURRENT_USER_PUBLIC_ID,
        friendshipId: FRIENDSHIP_ID,
      }),
    ).resolves.toBeUndefined();
    expect(friendCommandRepository.unblockUser).toHaveBeenCalledOnce();
  });

  it('相互ブロック解除を連続で2回実行しても成功させる', async () => {
    const { friendCommandRepository, useCase } = createUseCase(true, true);
    vi.mocked(friendCommandRepository.findFriendshipForUser)
      .mockResolvedValueOnce({
        friendshipId: FRIENDSHIP_ID,
        friendId: FRIEND_INTERNAL_ID,
        note: null,
        blockedByCurrentUser: true,
        blocksCurrentUser: true,
      })
      .mockResolvedValueOnce({
        friendshipId: FRIENDSHIP_ID,
        friendId: FRIEND_INTERNAL_ID,
        note: null,
        blockedByCurrentUser: false,
        blocksCurrentUser: true,
      });

    const input = {
      currentUserPublicId: CURRENT_USER_PUBLIC_ID,
      friendshipId: FRIENDSHIP_ID,
    };

    await expect(useCase.execute(input)).resolves.toBeUndefined();
    await expect(useCase.execute(input)).resolves.toBeUndefined();
    expect(friendCommandRepository.unblockUser).toHaveBeenCalledTimes(2);
  });
});
