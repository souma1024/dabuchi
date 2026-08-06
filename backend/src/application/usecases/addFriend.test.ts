import { describe, expect, it, vi } from 'vitest';

import {
  InvalidFriendshipError,
  type FriendProfile,
} from '../../domain/friendship.js';
import { InvalidFriendshipNoteError } from '../../domain/friendshipNote.js';
import { createCurrentUser } from '../../test/factories/currentUserFactory.js';
import { createCurrentUserRepository } from '../../test/factories/currentUserRepositoryFactory.js';
import { createFriendCommandRepository } from '../../test/factories/friendCommandRepositoryFactory.js';
import {
  FriendUserNotFoundError,
  FriendshipAlreadyExistsError,
  InvalidFriendUserIdError,
} from '../errors/friendCommandErrors.js';
import { CurrentUserNotFoundError } from '../errors/currentUserNotFoundError.js';
import { AddFriend } from './addFriend.js';

const CURRENT_USER_PUBLIC_ID = 'friend-001';
const CURRENT_USER_INTERNAL_ID = '11111111-1111-4111-8111-111111111111';
const FRIEND_INTERNAL_ID = '22222222-2222-4222-8222-222222222222';
const FRIENDSHIP_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function createUseCase(
  options: {
    currentUserExists?: boolean;
    friend?: FriendProfile | null;
    friendshipExists?: boolean;
    saveConflict?: boolean;
  } = {},
) {
  const currentUserRepository = createCurrentUserRepository({
    user:
      options.currentUserExists === false
        ? null
        : createCurrentUser({ id: CURRENT_USER_INTERNAL_ID }),
  });
  const friendCommandRepository = createFriendCommandRepository({
    friend: options.friend,
    friendshipExists: options.friendshipExists,
    savedFriendship: options.saveConflict ? null : undefined,
  });
  const generateId = vi.fn(() => FRIENDSHIP_ID);
  const useCase = new AddFriend(
    currentUserRepository,
    friendCommandRepository,
    generateId,
  );

  return {
    currentUserRepository,
    friendCommandRepository,
    generateId,
    useCase,
  };
}

describe('AddFriend', () => {
  it('公開user_idから相手を検索し、内部UUIDの友達関係を作成する', async () => {
    const { friendCommandRepository, useCase } = createUseCase();

    await expect(
      useCase.execute({
        currentUserPublicId: CURRENT_USER_PUBLIC_ID,
        friendUserId: '  friend-002  ',
        note: '  大学の友人  ',
      }),
    ).resolves.toEqual({
      friendshipId: FRIENDSHIP_ID,
      friend: {
        id: FRIEND_INTERNAL_ID,
        userId: 'friend-002',
        name: '佐藤 花子',
        profileUrl: '/assets/profiles/human2.png',
      },
      addedBy: {
        id: CURRENT_USER_INTERNAL_ID,
        userId: CURRENT_USER_PUBLIC_ID,
        name: '山田 太郎',
        profileUrl: '/assets/profiles/human1.png',
      },
      addedAt: '2026-08-06 12:00:00.000000',
      note: '大学の友人',
    });
    expect(friendCommandRepository.findUserByPublicId).toHaveBeenCalledWith(
      'friend-002',
    );
    expect(friendCommandRepository.createFriendship).toHaveBeenCalledWith({
      id: FRIENDSHIP_ID,
      user1Id: CURRENT_USER_INTERNAL_ID,
      user2Id: FRIEND_INTERNAL_ID,
      addedById: CURRENT_USER_INTERNAL_ID,
      initialNote: '大学の友人',
    });
  });

  it('初期メモを省略した場合はnoteレコードを作らない契約にする', async () => {
    const { friendCommandRepository, useCase } = createUseCase();

    await expect(
      useCase.execute({
        currentUserPublicId: CURRENT_USER_PUBLIC_ID,
        friendUserId: 'friend-002',
      }),
    ).resolves.toMatchObject({ note: null });
    expect(friendCommandRepository.createFriendship).toHaveBeenCalledWith(
      expect.objectContaining({ initialNote: null }),
    );
  });

  it('補助文字64文字の公開user_idを受け付ける', async () => {
    const { friendCommandRepository, useCase } = createUseCase();
    const friendUserId = '😀'.repeat(64);

    await expect(
      useCase.execute({
        currentUserPublicId: CURRENT_USER_PUBLIC_ID,
        friendUserId,
      }),
    ).resolves.toMatchObject({ friendshipId: FRIENDSHIP_ID });
    expect(friendCommandRepository.findUserByPublicId).toHaveBeenCalledWith(
      friendUserId,
    );
  });

  it('上限を超える初期メモをDB検索前に拒否する', async () => {
    const { currentUserRepository, useCase } = createUseCase();

    await expect(
      useCase.execute({
        currentUserPublicId: CURRENT_USER_PUBLIC_ID,
        friendUserId: 'friend-002',
        note: '友'.repeat(256),
      }),
    ).rejects.toBeInstanceOf(InvalidFriendshipNoteError);
    expect(currentUserRepository.findByUserId).not.toHaveBeenCalled();
  });

  it('current userが存在しなければ相手を検索しない', async () => {
    const { friendCommandRepository, useCase } = createUseCase({
      currentUserExists: false,
    });

    await expect(
      useCase.execute({
        currentUserPublicId: CURRENT_USER_PUBLIC_ID,
        friendUserId: 'friend-002',
      }),
    ).rejects.toBeInstanceOf(CurrentUserNotFoundError);
    expect(friendCommandRepository.findUserByPublicId).not.toHaveBeenCalled();
  });

  it('公開user_idの相手が存在しなければ404用errorにする', async () => {
    const { friendCommandRepository, useCase } = createUseCase({
      friend: null,
    });

    await expect(
      useCase.execute({
        currentUserPublicId: CURRENT_USER_PUBLIC_ID,
        friendUserId: 'unknown-user',
      }),
    ).rejects.toBeInstanceOf(FriendUserNotFoundError);
    expect(friendCommandRepository.createFriendship).not.toHaveBeenCalled();
  });

  it('自分自身の公開user_idを指定した追加を拒否する', async () => {
    const { friendCommandRepository, useCase } = createUseCase({
      friend: {
        id: CURRENT_USER_INTERNAL_ID,
        userId: CURRENT_USER_PUBLIC_ID,
        name: '山田 太郎',
        profileUrl: '/assets/profiles/human1.png',
      },
    });

    await expect(
      useCase.execute({
        currentUserPublicId: CURRENT_USER_PUBLIC_ID,
        friendUserId: CURRENT_USER_PUBLIC_ID,
      }),
    ).rejects.toBeInstanceOf(InvalidFriendshipError);
    expect(friendCommandRepository.friendshipExists).not.toHaveBeenCalled();
  });

  it('ブロック状態に関係なく既存の友達関係を409用errorにする', async () => {
    const { friendCommandRepository, generateId, useCase } = createUseCase({
      friendshipExists: true,
    });

    await expect(
      useCase.execute({
        currentUserPublicId: CURRENT_USER_PUBLIC_ID,
        friendUserId: 'friend-002',
      }),
    ).rejects.toBeInstanceOf(FriendshipAlreadyExistsError);
    expect(generateId).not.toHaveBeenCalled();
    expect(friendCommandRepository.createFriendship).not.toHaveBeenCalled();
  });

  it('同時追加による一意制約競合を409用errorにする', async () => {
    const { useCase } = createUseCase({ saveConflict: true });

    await expect(
      useCase.execute({
        currentUserPublicId: CURRENT_USER_PUBLIC_ID,
        friendUserId: 'friend-002',
      }),
    ).rejects.toBeInstanceOf(FriendshipAlreadyExistsError);
  });

  it.each(['', '   ', 'a'.repeat(65), '😀'.repeat(65)])(
    '不正な公開user_idをDB検索前に拒否する: %j',
    async (friendUserId) => {
      const { currentUserRepository, useCase } = createUseCase();

      await expect(
        useCase.execute({
          currentUserPublicId: CURRENT_USER_PUBLIC_ID,
          friendUserId,
        }),
      ).rejects.toBeInstanceOf(InvalidFriendUserIdError);
      expect(currentUserRepository.findByUserId).not.toHaveBeenCalled();
    },
  );
});
