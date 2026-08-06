import { describe, expect, it } from 'vitest';

import { createMysqlPool } from '../../test/factories/mysqlPoolFactory.js';
import { MysqlFriendQueryRepository } from './mysqlFriendQueryRepository.js';

const CURRENT_USER_ID = '11111111-1111-4111-8111-111111111111';
const FRIENDSHIP_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const ROW = {
  friendshipId: FRIENDSHIP_ID,
  friendId: '22222222-2222-4222-8222-222222222222',
  friendUserId: 'friend-002',
  friendName: '佐藤 花子',
  friendProfileUrl: '/assets/profiles/human2.png',
  addedById: CURRENT_USER_ID,
  addedByUserId: '001',
  addedByName: '山田 太郎',
  addedByProfileUrl: '/assets/profiles/human1.png',
  addedAt: '2026-08-06 12:30:00.000000',
  note: '大学の友人',
};

describe('MysqlFriendQueryRepository friend list', () => {
  it('双方向のブロックを除外し、自分のメモを含む友達一覧を取得する', async () => {
    const { pool, execute } = createMysqlPool([[ROW]]);
    const repository = new MysqlFriendQueryRepository(pool);

    await expect(
      repository.findFriends({
        currentUserId: CURRENT_USER_ID,
        cursor: null,
        limit: 21,
      }),
    ).resolves.toEqual([
      {
        friendshipId: FRIENDSHIP_ID,
        friend: {
          id: ROW.friendId,
          userId: ROW.friendUserId,
          name: ROW.friendName,
          profileUrl: ROW.friendProfileUrl,
        },
        addedBy: {
          id: ROW.addedById,
          userId: ROW.addedByUserId,
          name: ROW.addedByName,
          profileUrl: ROW.addedByProfileUrl,
        },
        addedAt: ROW.addedAt,
        note: ROW.note,
      },
    ]);
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('AND NOT EXISTS'),
      [CURRENT_USER_ID, '21'],
    );
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY f.created_at ASC, f.id ASC'),
      [CURRENT_USER_ID, '21'],
    );
  });

  it('次ページでは友達追加日時とfriendship UUIDをカーソル条件にする', async () => {
    const { pool, execute } = createMysqlPool([[]]);
    const repository = new MysqlFriendQueryRepository(pool);
    const cursor = { createdAt: ROW.addedAt, id: FRIENDSHIP_ID };

    await repository.findFriends({
      currentUserId: CURRENT_USER_ID,
      cursor,
      limit: 21,
    });

    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('f.created_at > ?'),
      [CURRENT_USER_ID, cursor.createdAt, cursor.createdAt, cursor.id, '21'],
    );
  });
});

describe('MysqlFriendQueryRepository friendship detail', () => {
  it('参加者に友達詳細と双方向のブロック状態を返す', async () => {
    const row = {
      ...ROW,
      blockedByCurrentUser: 1,
      blocksCurrentUser: 1,
    };
    const { pool, execute } = createMysqlPool([[row]]);
    const repository = new MysqlFriendQueryRepository(pool);

    await expect(
      repository.findFriendshipDetail({
        currentUserId: CURRENT_USER_ID,
        friendshipId: FRIENDSHIP_ID,
      }),
    ).resolves.toMatchObject({
      friendshipId: FRIENDSHIP_ID,
      friend: { id: ROW.friendId, userId: ROW.friendUserId },
      note: ROW.note,
      blockedByCurrentUser: true,
      blocksCurrentUser: true,
    });
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('AS blockedByCurrentUser'),
      [CURRENT_USER_ID, FRIENDSHIP_ID],
    );
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('AND current_user.id IN'),
      [CURRENT_USER_ID, FRIENDSHIP_ID],
    );
  });

  it('存在しない、または参加していない友達関係はnullを返す', async () => {
    const { pool } = createMysqlPool([[]]);
    const repository = new MysqlFriendQueryRepository(pool);

    await expect(
      repository.findFriendshipDetail({
        currentUserId: CURRENT_USER_ID,
        friendshipId: FRIENDSHIP_ID,
      }),
    ).resolves.toBeNull();
  });
});
