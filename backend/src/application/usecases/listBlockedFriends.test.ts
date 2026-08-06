import { describe, expect, it } from 'vitest';

import { CurrentUserNotFoundError } from '../errors/currentUserNotFoundError.js';
import { createCurrentUserRepository } from '../../test/factories/currentUserRepositoryFactory.js';
import {
  createBlockedFriendQueryRecord,
  createBlockedFriendQueryRecords,
} from '../../test/factories/friendQueryFactory.js';
import { createFriendQueryRepository } from '../../test/factories/friendQueryRepositoryFactory.js';
import { ListBlockedFriends } from './listBlockedFriends.js';

const CURRENT_USER_PUBLIC_ID = 'friend-001';
const CURRENT_USER_INTERNAL_ID = '11111111-1111-4111-8111-111111111111';

describe('ListBlockedFriends', () => {
  it('自分がブロックした友達を20件返し、次のカーソルを返す', async () => {
    const records = createBlockedFriendQueryRecords(21);
    const friendQueryRepository = createFriendQueryRepository({
      blockedFriends: records,
    });
    const useCase = new ListBlockedFriends(
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
      // 結果の日時はISO 8601。record由来のMySQL DATETIME形式のままにはしない。
      addedAt: '2026-08-06T10:00:01.000Z',
      note: records[0]?.note,
      blockedAt: '2026-08-06T11:00:01.000Z',
    });
    // カーソルはDBへ渡す値なのでMySQL DATETIME形式のまま。
    expect(result.nextCursor).toEqual({
      blockedAt: records[19]?.blockedAt,
      friendshipId: records[19]?.friendshipId,
    });
    expect(friendQueryRepository.findBlockedFriends).toHaveBeenCalledWith({
      currentUserId: CURRENT_USER_INTERNAL_ID,
      cursor: null,
      limit: 21,
    });
  });

  it('20件以下なら次のカーソルを返さない', async () => {
    const friendQueryRepository = createFriendQueryRepository({
      blockedFriends: [createBlockedFriendQueryRecord()],
    });
    const useCase = new ListBlockedFriends(
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
    const useCase = new ListBlockedFriends(
      createCurrentUserRepository(),
      friendQueryRepository,
    );
    const cursor = {
      blockedAt: '2026-08-06 11:00:20.000000',
      friendshipId: '10000000-0000-4000-8000-000000000020',
    };

    await useCase.execute({
      currentUserPublicId: CURRENT_USER_PUBLIC_ID,
      cursor,
    });

    expect(friendQueryRepository.findBlockedFriends).toHaveBeenCalledWith({
      currentUserId: CURRENT_USER_INTERNAL_ID,
      cursor,
      limit: 21,
    });
  });

  it('current userが存在しなければブロック一覧を検索しない', async () => {
    const friendQueryRepository = createFriendQueryRepository();
    const useCase = new ListBlockedFriends(
      createCurrentUserRepository({ user: null }),
      friendQueryRepository,
    );

    await expect(
      useCase.execute({
        currentUserPublicId: CURRENT_USER_PUBLIC_ID,
        cursor: null,
      }),
    ).rejects.toBeInstanceOf(CurrentUserNotFoundError);
    expect(friendQueryRepository.findBlockedFriends).not.toHaveBeenCalled();
  });
});
