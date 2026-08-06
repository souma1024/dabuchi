import { describe, expect, it } from 'vitest';

import { createCurrentUserRepository } from '../../test/factories/currentUserRepositoryFactory.js';
import { createFriendCommandRepository } from '../../test/factories/friendCommandRepositoryFactory.js';
import { FriendshipNotFoundError } from '../errors/friendCommandErrors.js';
import type { FriendshipCommandRecord } from '../ports/friendCommandRepository.js';
import { DeleteFriendshipNote } from './deleteFriendshipNote.js';

const CURRENT_USER_PUBLIC_ID = 'friend-001';
const CURRENT_USER_INTERNAL_ID = '11111111-1111-4111-8111-111111111111';
const FRIENDSHIP_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function createUseCase(note: string | null, blocksCurrentUser = false) {
  const friendship: FriendshipCommandRecord = {
    friendshipId: FRIENDSHIP_ID,
    friendId: '22222222-2222-4222-8222-222222222222',
    note,
    blockedByCurrentUser: false,
    blocksCurrentUser,
  };
  const friendCommandRepository = createFriendCommandRepository({
    friendship,
  });
  const useCase = new DeleteFriendshipNote(
    createCurrentUserRepository(),
    friendCommandRepository,
  );

  return { friendCommandRepository, useCase };
}

describe('DeleteFriendshipNote', () => {
  it('current user固有のnoteを削除する', async () => {
    const { friendCommandRepository, useCase } = createUseCase('既存メモ');

    await expect(
      useCase.execute({
        currentUserPublicId: CURRENT_USER_PUBLIC_ID,
        friendshipId: FRIENDSHIP_ID,
      }),
    ).resolves.toBeUndefined();
    expect(friendCommandRepository.deleteNote).toHaveBeenCalledWith({
      friendshipId: FRIENDSHIP_ID,
      userId: CURRENT_USER_INTERNAL_ID,
    });
  });

  it('noteがなくても削除を冪等に成功させる', async () => {
    const { useCase } = createUseCase(null);

    await expect(
      useCase.execute({
        currentUserPublicId: CURRENT_USER_PUBLIC_ID,
        friendshipId: FRIENDSHIP_ID,
      }),
    ).resolves.toBeUndefined();
  });

  it('相手からのみブロック中ならnoteを削除しない', async () => {
    const { friendCommandRepository, useCase } = createUseCase(
      '既存メモ',
      true,
    );

    await expect(
      useCase.execute({
        currentUserPublicId: CURRENT_USER_PUBLIC_ID,
        friendshipId: FRIENDSHIP_ID,
      }),
    ).rejects.toBeInstanceOf(FriendshipNotFoundError);
    expect(friendCommandRepository.deleteNote).not.toHaveBeenCalled();
  });
});
