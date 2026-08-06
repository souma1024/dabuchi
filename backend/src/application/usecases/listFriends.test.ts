import { describe, expect, it } from 'vitest';

import { CurrentUserNotFoundError } from '../errors/currentUserNotFoundError.js';
import { createCurrentUserRepository } from '../../test/factories/currentUserRepositoryFactory.js';
import {
  createFriendQueryRecord,
  createFriendQueryRecords,
} from '../../test/factories/friendQueryFactory.js';
import { createFriendQueryRepository } from '../../test/factories/friendQueryRepositoryFactory.js';
import { ListFriends } from './listFriends.js';

const CURRENT_USER_PUBLIC_ID = 'friend-001';
const CURRENT_USER_INTERNAL_ID = '11111111-1111-4111-8111-111111111111';

describe('ListFriends', () => {
  it('友達を20件返し、21件目があれば次のカーソルを返す', async () => {
    const records = createFriendQueryRecords(21);
    const friendQueryRepository = createFriendQueryRepository({
      friends: records,
    });
    const useCase = new ListFriends(
      createCurrentUserRepository(),
      friendQueryRepository,
    );

    const result = await useCase.execute({
      currentUserPublicId: CURRENT_USER_PUBLIC_ID,
      cursor: null,
    });

    expect(result.friends).toHaveLength(20);
    expect(result.friends[0]).toEqual({
      friendshipId: records[0]?.friendshipId,
      friend: records[0]?.friend,
      addedBy: records[0]?.addedBy,
      addedAt: records[0]?.addedAt,
      note: records[0]?.note,
    });
    expect(result.nextCursor).toEqual({
      createdAt: records[19]?.addedAt,
      id: records[19]?.friendshipId,
    });
    expect(friendQueryRepository.findFriends).toHaveBeenCalledWith({
      currentUserId: CURRENT_USER_INTERNAL_ID,
      cursor: null,
      limit: 21,
    });
  });

  it('20件以下なら次のカーソルを返さない', async () => {
    const friendQueryRepository = createFriendQueryRepository({
      friends: [createFriendQueryRecord()],
    });
    const useCase = new ListFriends(
      createCurrentUserRepository(),
      friendQueryRepository,
    );

    const result = await useCase.execute({
      currentUserPublicId: CURRENT_USER_PUBLIC_ID,
      cursor: null,
    });

    expect(result.nextCursor).toBeNull();
  });

  it('受け取ったカーソルをrepositoryへ渡す', async () => {
    const friendQueryRepository = createFriendQueryRepository();
    const useCase = new ListFriends(
      createCurrentUserRepository(),
      friendQueryRepository,
    );
    const cursor = {
      createdAt: '2026-08-06 10:00:20.000000',
      id: '10000000-0000-4000-8000-000000000020',
    };

    await useCase.execute({
      currentUserPublicId: CURRENT_USER_PUBLIC_ID,
      cursor,
    });

    expect(friendQueryRepository.findFriends).toHaveBeenCalledWith({
      currentUserId: CURRENT_USER_INTERNAL_ID,
      cursor,
      limit: 21,
    });
  });

  it('current userが存在しなければ友達を検索しない', async () => {
    const friendQueryRepository = createFriendQueryRepository();
    const useCase = new ListFriends(
      createCurrentUserRepository({ user: null }),
      friendQueryRepository,
    );

    await expect(
      useCase.execute({
        currentUserPublicId: CURRENT_USER_PUBLIC_ID,
        cursor: null,
      }),
    ).rejects.toBeInstanceOf(CurrentUserNotFoundError);
    expect(friendQueryRepository.findFriends).not.toHaveBeenCalled();
  });
});
