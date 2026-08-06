import { describe, expect, it } from 'vitest';

import { createMysqlPool } from '../../test/factories/mysqlPoolFactory.js';
import { MysqlFriendCommandRepository } from './mysqlFriendCommandRepository.js';

const FRIENDSHIP = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  user1Id: '11111111-1111-4111-8111-111111111111',
  user2Id: '22222222-2222-4222-8222-222222222222',
  addedById: '11111111-1111-4111-8111-111111111111',
  initialNote: null,
};

describe('MysqlFriendCommandRepository friendship creation', () => {
  it('公開user_idから表示用ユーザーを取得する', async () => {
    const friend = {
      id: FRIENDSHIP.user2Id,
      userId: 'friend-002',
      name: '佐藤 花子',
      profileUrl: '/assets/profiles/human2.png',
    };
    const { pool, execute } = createMysqlPool([[friend]]);
    const repository = new MysqlFriendCommandRepository(pool);

    await expect(repository.findUserByPublicId('friend-002')).resolves.toEqual(
      friend,
    );
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('WHERE user_id = ?'),
      ['friend-002'],
    );
  });

  it('公開user_idのユーザーがいなければnullを返す', async () => {
    const { pool } = createMysqlPool([[]]);
    const repository = new MysqlFriendCommandRepository(pool);

    await expect(repository.findUserByPublicId('unknown')).resolves.toBeNull();
  });

  it('canonical pairの既存関係を確認する', async () => {
    const { pool, execute } = createMysqlPool([[{ found: 1 }]]);
    const repository = new MysqlFriendCommandRepository(pool);

    await expect(
      repository.friendshipExists({
        user1Id: FRIENDSHIP.user1Id,
        user2Id: FRIENDSHIP.user2Id,
      }),
    ).resolves.toBe(true);
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('user1_id = UUID_TO_BIN(?)'),
      [FRIENDSHIP.user1Id, FRIENDSHIP.user2Id],
    );
  });

  it('内部UUIDで友達関係を保存し、DBの作成日時を返す', async () => {
    const savedFriendship = {
      id: FRIENDSHIP.id,
      user1Id: FRIENDSHIP.user1Id,
      user2Id: FRIENDSHIP.user2Id,
      addedById: FRIENDSHIP.addedById,
      createdAt: '2026-08-06 12:30:00.000000',
    };
    const { pool, execute, connection } = createMysqlPool([
      { affectedRows: 1 },
      [savedFriendship],
    ]);
    const repository = new MysqlFriendCommandRepository(pool);

    await expect(repository.createFriendship(FRIENDSHIP)).resolves.toEqual(
      savedFriendship,
    );
    expect(execute).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('INSERT INTO friendships'),
      [
        FRIENDSHIP.id,
        FRIENDSHIP.user1Id,
        FRIENDSHIP.user2Id,
        FRIENDSHIP.addedById,
      ],
    );
    expect(execute).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining(
        "DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s.%f')",
      ),
      [FRIENDSHIP.id],
    );
    expect(connection.beginTransaction).toHaveBeenCalledOnce();
    expect(connection.commit).toHaveBeenCalledOnce();
    expect(connection.rollback).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledOnce();
  });

  it('追加者の初期メモを友達関係と同じtransactionで保存する', async () => {
    const friendshipWithNote = {
      ...FRIENDSHIP,
      initialNote: '大学の友人',
    };
    const savedFriendship = {
      id: FRIENDSHIP.id,
      user1Id: FRIENDSHIP.user1Id,
      user2Id: FRIENDSHIP.user2Id,
      addedById: FRIENDSHIP.addedById,
      createdAt: '2026-08-06 12:30:00.000000',
    };
    const { pool, execute, connection } = createMysqlPool([
      { affectedRows: 1 },
      { affectedRows: 1 },
      [savedFriendship],
    ]);
    const repository = new MysqlFriendCommandRepository(pool);

    await expect(
      repository.createFriendship(friendshipWithNote),
    ).resolves.toEqual(savedFriendship);
    expect(execute).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO friendship_notes'),
      [FRIENDSHIP.id, FRIENDSHIP.addedById, '大学の友人'],
    );
    expect(connection.commit).toHaveBeenCalledOnce();
  });

  it('同時追加のduplicate entryをnullへ変換する', async () => {
    const duplicateError = Object.assign(new Error('duplicate'), {
      code: 'ER_DUP_ENTRY',
    });
    const { pool, execute, connection } = createMysqlPool([duplicateError]);
    const repository = new MysqlFriendCommandRepository(pool);

    await expect(repository.createFriendship(FRIENDSHIP)).resolves.toBeNull();
    expect(execute).toHaveBeenCalledOnce();
    expect(connection.rollback).toHaveBeenCalledOnce();
    expect(connection.commit).not.toHaveBeenCalled();
  });

  it('duplicate以外のDB errorは握りつぶさない', async () => {
    const databaseError = new Error('connection lost');
    const { pool, connection } = createMysqlPool([databaseError]);
    const repository = new MysqlFriendCommandRepository(pool);

    await expect(repository.createFriendship(FRIENDSHIP)).rejects.toBe(
      databaseError,
    );
    expect(connection.rollback).toHaveBeenCalledOnce();
  });
});
