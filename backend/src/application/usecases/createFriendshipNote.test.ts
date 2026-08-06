import { describe, expect, it } from 'vitest';

import { InvalidFriendshipNoteError } from '../../domain/friendshipNote.js';
import { createCurrentUserRepository } from '../../test/factories/currentUserRepositoryFactory.js';
import { createFriendCommandRepository } from '../../test/factories/friendCommandRepositoryFactory.js';
import {
  FriendshipNoteAlreadyExistsError,
  FriendshipNotFoundError,
  InvalidFriendshipIdError,
} from '../errors/friendCommandErrors.js';
import { CurrentUserNotFoundError } from '../errors/currentUserNotFoundError.js';
import type { FriendshipCommandRecord } from '../ports/friendCommandRepository.js';
import { CreateFriendshipNote } from './createFriendshipNote.js';

const CURRENT_USER_PUBLIC_ID = 'friend-001';
const CURRENT_USER_INTERNAL_ID = '11111111-1111-4111-8111-111111111111';
const FRIENDSHIP_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function createFriendship(
  overrides: Partial<FriendshipCommandRecord> = {},
): FriendshipCommandRecord {
  return {
    friendshipId: FRIENDSHIP_ID,
    friendId: '22222222-2222-4222-8222-222222222222',
    note: null,
    blockedByCurrentUser: false,
    blocksCurrentUser: false,
    ...overrides,
  };
}

function createUseCase(
  options: {
    currentUserExists?: boolean;
    friendship?: FriendshipCommandRecord | null;
    saveConflict?: boolean;
  } = {},
) {
  const currentUserRepository = createCurrentUserRepository({
    user: options.currentUserExists === false ? null : undefined,
  });
  const friendCommandRepository = createFriendCommandRepository({
    friendship:
      options.friendship === undefined
        ? createFriendship()
        : options.friendship,
    savedNote: options.saveConflict ? null : undefined,
  });
  const useCase = new CreateFriendshipNote(
    currentUserRepository,
    friendCommandRepository,
  );

  return { currentUserRepository, friendCommandRepository, useCase };
}

describe('CreateFriendshipNote', () => {
  it('current user固有のメモをtrimして作成する', async () => {
    const { friendCommandRepository, useCase } = createUseCase();

    await expect(
      useCase.execute({
        currentUserPublicId: CURRENT_USER_PUBLIC_ID,
        friendshipId: FRIENDSHIP_ID.toUpperCase(),
        message: '  大学の友達  ',
      }),
    ).resolves.toEqual({
      friendshipId: FRIENDSHIP_ID,
      userId: CURRENT_USER_INTERNAL_ID,
      message: '大学の友達',
      createdAt: '2026-08-06 12:10:00.000000',
      updatedAt: '2026-08-06 12:10:00.000000',
    });
    expect(friendCommandRepository.findFriendshipForUser).toHaveBeenCalledWith({
      currentUserId: CURRENT_USER_INTERNAL_ID,
      friendshipId: FRIENDSHIP_ID,
    });
    expect(friendCommandRepository.createNote).toHaveBeenCalledWith({
      friendshipId: FRIENDSHIP_ID,
      userId: CURRENT_USER_INTERNAL_ID,
      message: '大学の友達',
    });
  });

  it.each([
    ['自分からブロック中', true, false],
    ['相互ブロック中', true, true],
  ])('%sでも自分のメモ作成を許可する', async (_label, outgoing, incoming) => {
    const { useCase } = createUseCase({
      friendship: createFriendship({
        blockedByCurrentUser: outgoing,
        blocksCurrentUser: incoming,
      }),
    });

    await expect(
      useCase.execute({
        currentUserPublicId: CURRENT_USER_PUBLIC_ID,
        friendshipId: FRIENDSHIP_ID,
        message: 'ブロックリスト用メモ',
      }),
    ).resolves.toMatchObject({ message: 'ブロックリスト用メモ' });
  });

  it('相手からのみブロックされている場合は存在を公開しない', async () => {
    const { friendCommandRepository, useCase } = createUseCase({
      friendship: createFriendship({ blocksCurrentUser: true }),
    });

    await expect(
      useCase.execute({
        currentUserPublicId: CURRENT_USER_PUBLIC_ID,
        friendshipId: FRIENDSHIP_ID,
        message: 'メモ',
      }),
    ).rejects.toBeInstanceOf(FriendshipNotFoundError);
    expect(friendCommandRepository.createNote).not.toHaveBeenCalled();
  });

  it('参加していない、または存在しない友達関係を拒否する', async () => {
    const { useCase } = createUseCase({ friendship: null });

    await expect(
      useCase.execute({
        currentUserPublicId: CURRENT_USER_PUBLIC_ID,
        friendshipId: FRIENDSHIP_ID,
        message: 'メモ',
      }),
    ).rejects.toBeInstanceOf(FriendshipNotFoundError);
  });

  it('既に自分のメモがあれば409用errorにする', async () => {
    const { friendCommandRepository, useCase } = createUseCase({
      friendship: createFriendship({ note: '既存メモ' }),
    });

    await expect(
      useCase.execute({
        currentUserPublicId: CURRENT_USER_PUBLIC_ID,
        friendshipId: FRIENDSHIP_ID,
        message: '新しいメモ',
      }),
    ).rejects.toBeInstanceOf(FriendshipNoteAlreadyExistsError);
    expect(friendCommandRepository.createNote).not.toHaveBeenCalled();
  });

  it('同時作成による一意制約競合を409用errorにする', async () => {
    const { useCase } = createUseCase({ saveConflict: true });

    await expect(
      useCase.execute({
        currentUserPublicId: CURRENT_USER_PUBLIC_ID,
        friendshipId: FRIENDSHIP_ID,
        message: 'メモ',
      }),
    ).rejects.toBeInstanceOf(FriendshipNoteAlreadyExistsError);
  });

  it.each(['', '   ', '友'.repeat(256)])(
    '作成できないメモをDB検索前に拒否する: %j',
    async (message) => {
      const { currentUserRepository, useCase } = createUseCase();

      await expect(
        useCase.execute({
          currentUserPublicId: CURRENT_USER_PUBLIC_ID,
          friendshipId: FRIENDSHIP_ID,
          message,
        }),
      ).rejects.toBeInstanceOf(InvalidFriendshipNoteError);
      expect(currentUserRepository.findByUserId).not.toHaveBeenCalled();
    },
  );

  it('不正なfriendshipIdをcurrent user検索前に拒否する', async () => {
    const { currentUserRepository, useCase } = createUseCase();

    await expect(
      useCase.execute({
        currentUserPublicId: CURRENT_USER_PUBLIC_ID,
        friendshipId: 'invalid',
        message: 'メモ',
      }),
    ).rejects.toBeInstanceOf(InvalidFriendshipIdError);
    expect(currentUserRepository.findByUserId).not.toHaveBeenCalled();
  });

  it('current userが存在しなければ友達関係を検索しない', async () => {
    const { friendCommandRepository, useCase } = createUseCase({
      currentUserExists: false,
    });

    await expect(
      useCase.execute({
        currentUserPublicId: CURRENT_USER_PUBLIC_ID,
        friendshipId: FRIENDSHIP_ID,
        message: 'メモ',
      }),
    ).rejects.toBeInstanceOf(CurrentUserNotFoundError);
    expect(
      friendCommandRepository.findFriendshipForUser,
    ).not.toHaveBeenCalled();
  });
});
