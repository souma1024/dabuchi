import { describe, expect, it } from 'vitest';

import { InvalidFriendshipNoteError } from '../../domain/friendshipNote.js';
import { createCurrentUserRepository } from '../../test/factories/currentUserRepositoryFactory.js';
import { createFriendCommandRepository } from '../../test/factories/friendCommandRepositoryFactory.js';
import {
  FriendshipNoteNotFoundError,
  FriendshipNotFoundError,
} from '../errors/friendCommandErrors.js';
import type { FriendshipCommandRecord } from '../ports/friendCommandRepository.js';
import { UpdateFriendshipNote } from './updateFriendshipNote.js';

const CURRENT_USER_PUBLIC_ID = 'friend-001';
const CURRENT_USER_INTERNAL_ID = '11111111-1111-4111-8111-111111111111';
const FRIENDSHIP_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function createFriendship(
  overrides: Partial<FriendshipCommandRecord> = {},
): FriendshipCommandRecord {
  return {
    friendshipId: FRIENDSHIP_ID,
    friendId: '22222222-2222-4222-8222-222222222222',
    note: '既存メモ',
    blockedByCurrentUser: false,
    blocksCurrentUser: false,
    ...overrides,
  };
}

function createUseCase(
  options: {
    friendship?: FriendshipCommandRecord | null;
    updateConflict?: boolean;
  } = {},
) {
  const currentUserRepository = createCurrentUserRepository();
  const friendCommandRepository = createFriendCommandRepository({
    friendship:
      options.friendship === undefined
        ? createFriendship()
        : options.friendship,
    updatedNote: options.updateConflict ? null : undefined,
  });
  const useCase = new UpdateFriendshipNote(
    currentUserRepository,
    friendCommandRepository,
  );

  return { currentUserRepository, friendCommandRepository, useCase };
}

describe('UpdateFriendshipNote', () => {
  it('既存メモをtrimして更新する', async () => {
    const { friendCommandRepository, useCase } = createUseCase();

    await expect(
      useCase.execute({
        currentUserPublicId: CURRENT_USER_PUBLIC_ID,
        friendshipId: FRIENDSHIP_ID,
        message: '  更新後メモ  ',
      }),
    ).resolves.toEqual({
      friendshipId: FRIENDSHIP_ID,
      userId: CURRENT_USER_INTERNAL_ID,
      message: '更新後メモ',
      createdAt: '2026-08-06 12:10:00.000000',
      updatedAt: '2026-08-06 12:20:00.000000',
    });
    expect(friendCommandRepository.updateNote).toHaveBeenCalledWith({
      friendshipId: FRIENDSHIP_ID,
      userId: CURRENT_USER_INTERNAL_ID,
      message: '更新後メモ',
    });
  });

  it.each(['', '   '])(
    '空メモはrowを削除してnullを返す: %j',
    async (message) => {
      const { friendCommandRepository, useCase } = createUseCase();

      await expect(
        useCase.execute({
          currentUserPublicId: CURRENT_USER_PUBLIC_ID,
          friendshipId: FRIENDSHIP_ID,
          message,
        }),
      ).resolves.toBeNull();
      expect(friendCommandRepository.deleteNote).toHaveBeenCalledWith({
        friendshipId: FRIENDSHIP_ID,
        userId: CURRENT_USER_INTERNAL_ID,
      });
      expect(friendCommandRepository.updateNote).not.toHaveBeenCalled();
    },
  );

  it('noteがなくても空メモによる削除を冪等に成功させる', async () => {
    const { useCase } = createUseCase({
      friendship: createFriendship({ note: null }),
    });

    await expect(
      useCase.execute({
        currentUserPublicId: CURRENT_USER_PUBLIC_ID,
        friendshipId: FRIENDSHIP_ID,
        message: '',
      }),
    ).resolves.toBeNull();
  });

  it('noteがない状態の通常更新は404用errorにする', async () => {
    const { friendCommandRepository, useCase } = createUseCase({
      friendship: createFriendship({ note: null }),
    });

    await expect(
      useCase.execute({
        currentUserPublicId: CURRENT_USER_PUBLIC_ID,
        friendshipId: FRIENDSHIP_ID,
        message: '更新メモ',
      }),
    ).rejects.toBeInstanceOf(FriendshipNoteNotFoundError);
    expect(friendCommandRepository.updateNote).not.toHaveBeenCalled();
  });

  it('更新直前にnoteが消えたraceを404用errorにする', async () => {
    const { useCase } = createUseCase({ updateConflict: true });

    await expect(
      useCase.execute({
        currentUserPublicId: CURRENT_USER_PUBLIC_ID,
        friendshipId: FRIENDSHIP_ID,
        message: '更新メモ',
      }),
    ).rejects.toBeInstanceOf(FriendshipNoteNotFoundError);
  });

  it('自分からブロック中でもメモ更新を許可する', async () => {
    const { useCase } = createUseCase({
      friendship: createFriendship({ blockedByCurrentUser: true }),
    });

    await expect(
      useCase.execute({
        currentUserPublicId: CURRENT_USER_PUBLIC_ID,
        friendshipId: FRIENDSHIP_ID,
        message: 'ブロック中メモ',
      }),
    ).resolves.toMatchObject({ message: 'ブロック中メモ' });
  });

  it('相手からのみブロック中ならメモを更新しない', async () => {
    const { friendCommandRepository, useCase } = createUseCase({
      friendship: createFriendship({ blocksCurrentUser: true }),
    });

    await expect(
      useCase.execute({
        currentUserPublicId: CURRENT_USER_PUBLIC_ID,
        friendshipId: FRIENDSHIP_ID,
        message: '更新メモ',
      }),
    ).rejects.toBeInstanceOf(FriendshipNotFoundError);
    expect(friendCommandRepository.updateNote).not.toHaveBeenCalled();
  });

  it('256文字のメモをDB検索前に拒否する', async () => {
    const { currentUserRepository, useCase } = createUseCase();

    await expect(
      useCase.execute({
        currentUserPublicId: CURRENT_USER_PUBLIC_ID,
        friendshipId: FRIENDSHIP_ID,
        message: '友'.repeat(256),
      }),
    ).rejects.toBeInstanceOf(InvalidFriendshipNoteError);
    expect(currentUserRepository.findByUserId).not.toHaveBeenCalled();
  });
});
