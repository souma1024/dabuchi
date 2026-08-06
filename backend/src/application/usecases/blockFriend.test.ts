import { describe, expect, it } from 'vitest';

import { InvalidUserBlockError } from '../../domain/userBlock.js';
import { createCurrentUserRepository } from '../../test/factories/currentUserRepositoryFactory.js';
import { createFriendCommandRepository } from '../../test/factories/friendCommandRepositoryFactory.js';
import { FriendshipNotFoundError } from '../errors/friendCommandErrors.js';
import type { FriendshipCommandRecord } from '../ports/friendCommandRepository.js';
import { BlockFriend } from './blockFriend.js';

const CURRENT_USER_PUBLIC_ID = 'friend-001';
const CURRENT_USER_INTERNAL_ID = '11111111-1111-4111-8111-111111111111';
const FRIEND_INTERNAL_ID = '22222222-2222-4222-8222-222222222222';
const FRIENDSHIP_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function createFriendship(
  overrides: Partial<FriendshipCommandRecord> = {},
): FriendshipCommandRecord {
  return {
    friendshipId: FRIENDSHIP_ID,
    friendId: FRIEND_INTERNAL_ID,
    note: null,
    blockedByCurrentUser: false,
    blocksCurrentUser: false,
    ...overrides,
  };
}

function createUseCase(friendship = createFriendship()) {
  const friendCommandRepository = createFriendCommandRepository({
    friendship,
  });
  const useCase = new BlockFriend(
    createCurrentUserRepository(),
    friendCommandRepository,
  );

  return { friendCommandRepository, useCase };
}

describe('BlockFriend', () => {
  it('friendshipの相手をcurrent userからブロックする', async () => {
    const { friendCommandRepository, useCase } = createUseCase();

    await expect(
      useCase.execute({
        currentUserPublicId: CURRENT_USER_PUBLIC_ID,
        friendshipId: FRIENDSHIP_ID,
      }),
    ).resolves.toEqual({ friendshipId: FRIENDSHIP_ID, blocked: true });
    expect(friendCommandRepository.blockUser).toHaveBeenCalledWith({
      blockerId: CURRENT_USER_INTERNAL_ID,
      blockedUserId: FRIEND_INTERNAL_ID,
    });
  });

  it.each([
    ['既に自分からブロック中', true, false],
    ['相互ブロック中', true, true],
  ])('%sでも冪等に成功する', async (_label, outgoing, incoming) => {
    const { friendCommandRepository, useCase } = createUseCase(
      createFriendship({
        blockedByCurrentUser: outgoing,
        blocksCurrentUser: incoming,
      }),
    );

    await expect(
      useCase.execute({
        currentUserPublicId: CURRENT_USER_PUBLIC_ID,
        friendshipId: FRIENDSHIP_ID,
      }),
    ).resolves.toEqual({ friendshipId: FRIENDSHIP_ID, blocked: true });
    expect(friendCommandRepository.blockUser).toHaveBeenCalledOnce();
  });

  it('相手からのみブロック中なら関係を公開しない', async () => {
    const { friendCommandRepository, useCase } = createUseCase(
      createFriendship({ blocksCurrentUser: true }),
    );

    await expect(
      useCase.execute({
        currentUserPublicId: CURRENT_USER_PUBLIC_ID,
        friendshipId: FRIENDSHIP_ID,
      }),
    ).rejects.toBeInstanceOf(FriendshipNotFoundError);
    expect(friendCommandRepository.blockUser).not.toHaveBeenCalled();
  });

  it('壊れた自己friendshipをブロックしない', async () => {
    const { friendCommandRepository, useCase } = createUseCase(
      createFriendship({ friendId: CURRENT_USER_INTERNAL_ID }),
    );

    await expect(
      useCase.execute({
        currentUserPublicId: CURRENT_USER_PUBLIC_ID,
        friendshipId: FRIENDSHIP_ID,
      }),
    ).rejects.toBeInstanceOf(InvalidUserBlockError);
    expect(friendCommandRepository.blockUser).not.toHaveBeenCalled();
  });
});
