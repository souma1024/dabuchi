import { describe, expect, it } from 'vitest';

import { FriendshipNotFoundError } from '../errors/friendshipNotFoundError.js';
import { createCurrentUserRepository } from '../../test/factories/currentUserRepositoryFactory.js';
import { createFriendshipDetailQueryRecord } from '../../test/factories/friendQueryFactory.js';
import { createFriendQueryRepository } from '../../test/factories/friendQueryRepositoryFactory.js';
import { GetFriendshipDetail } from './getFriendshipDetail.js';

const CURRENT_USER_PUBLIC_ID = 'friend-001';
const CURRENT_USER_INTERNAL_ID = '11111111-1111-4111-8111-111111111111';
const FRIENDSHIP_ID = '10000000-0000-4000-8000-000000000001';

function createUseCase(
  detail = createFriendshipDetailQueryRecord(1, {
    friendshipId: FRIENDSHIP_ID,
  }),
) {
  const friendQueryRepository = createFriendQueryRepository({ detail });
  const useCase = new GetFriendshipDetail(
    createCurrentUserRepository(),
    friendQueryRepository,
  );

  return { friendQueryRepository, useCase };
}

describe('GetFriendshipDetail', () => {
  it('友達・追加者・追加日時・自分のメモを返す', async () => {
    const detail = createFriendshipDetailQueryRecord(1, {
      friendshipId: FRIENDSHIP_ID,
      note: '大学の友達',
    });
    const { friendQueryRepository, useCase } = createUseCase(detail);

    await expect(
      useCase.execute({
        currentUserPublicId: CURRENT_USER_PUBLIC_ID,
        friendshipId: FRIENDSHIP_ID,
      }),
    ).resolves.toEqual({
      friendshipId: detail.friendshipId,
      friend: detail.friend,
      addedBy: detail.addedBy,
      addedAt: detail.addedAt,
      note: '大学の友達',
    });
    expect(friendQueryRepository.findFriendshipDetail).toHaveBeenCalledWith({
      currentUserId: CURRENT_USER_INTERNAL_ID,
      friendshipId: FRIENDSHIP_ID,
    });
  });

  it('自分がブロック中でもブロックリスト用に詳細を返す', async () => {
    const { useCase } = createUseCase(
      createFriendshipDetailQueryRecord(1, {
        friendshipId: FRIENDSHIP_ID,
        blockedByCurrentUser: true,
      }),
    );

    await expect(
      useCase.execute({
        currentUserPublicId: CURRENT_USER_PUBLIC_ID,
        friendshipId: FRIENDSHIP_ID,
      }),
    ).resolves.toMatchObject({ friendshipId: FRIENDSHIP_ID });
  });

  it('相互ブロック中でも自分のブロックリスト用に詳細を返す', async () => {
    const { useCase } = createUseCase(
      createFriendshipDetailQueryRecord(1, {
        friendshipId: FRIENDSHIP_ID,
        blockedByCurrentUser: true,
        blocksCurrentUser: true,
      }),
    );

    await expect(
      useCase.execute({
        currentUserPublicId: CURRENT_USER_PUBLIC_ID,
        friendshipId: FRIENDSHIP_ID,
      }),
    ).resolves.toMatchObject({ friendshipId: FRIENDSHIP_ID });
  });

  it('相手からのみブロックされている場合は詳細を公開しない', async () => {
    const { useCase } = createUseCase(
      createFriendshipDetailQueryRecord(1, {
        friendshipId: FRIENDSHIP_ID,
        blocksCurrentUser: true,
      }),
    );

    await expect(
      useCase.execute({
        currentUserPublicId: CURRENT_USER_PUBLIC_ID,
        friendshipId: FRIENDSHIP_ID,
      }),
    ).rejects.toBeInstanceOf(FriendshipNotFoundError);
  });

  it('参加していない、または存在しない友達関係は公開しない', async () => {
    const friendQueryRepository = createFriendQueryRepository({ detail: null });
    const useCase = new GetFriendshipDetail(
      createCurrentUserRepository(),
      friendQueryRepository,
    );

    await expect(
      useCase.execute({
        currentUserPublicId: CURRENT_USER_PUBLIC_ID,
        friendshipId: FRIENDSHIP_ID,
      }),
    ).rejects.toBeInstanceOf(FriendshipNotFoundError);
  });
});
