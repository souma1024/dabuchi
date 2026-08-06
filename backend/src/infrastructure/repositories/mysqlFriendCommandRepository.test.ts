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

const NOTE = {
  friendshipId: FRIENDSHIP.id,
  userId: FRIENDSHIP.user1Id,
  message: '大学の友人',
  createdAt: '2026-08-06 12:40:00.000000',
  updatedAt: '2026-08-06 12:40:00.000000',
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

describe('MysqlFriendCommandRepository friendship note', () => {
  it('現在ユーザーの友達関係・メモ・ブロック方向を取得する', async () => {
    const row = {
      friendshipId: FRIENDSHIP.id,
      friendId: FRIENDSHIP.user2Id,
      note: NOTE.message,
      blockedByCurrentUser: 1,
      blocksCurrentUser: 0,
    };
    const { pool, execute } = createMysqlPool([[row]]);
    const repository = new MysqlFriendCommandRepository(pool);

    await expect(
      repository.findFriendshipForUser({
        currentUserId: FRIENDSHIP.user1Id,
        friendshipId: FRIENDSHIP.id,
      }),
    ).resolves.toEqual({
      ...row,
      blockedByCurrentUser: true,
      blocksCurrentUser: false,
    });
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('AND requesting_user.id IN'),
      [FRIENDSHIP.user1Id, FRIENDSHIP.id],
    );
    expect(execute).toHaveBeenCalledWith(
      expect.not.stringContaining('current_user'),
      [FRIENDSHIP.user1Id, FRIENDSHIP.id],
    );
  });

  it('参加していない友達関係はnullを返す', async () => {
    const { pool } = createMysqlPool([[]]);
    const repository = new MysqlFriendCommandRepository(pool);

    await expect(
      repository.findFriendshipForUser({
        currentUserId: FRIENDSHIP.user1Id,
        friendshipId: FRIENDSHIP.id,
      }),
    ).resolves.toBeNull();
  });

  it('個別メモを作成しDBの日時を返す', async () => {
    const { pool, execute } = createMysqlPool([{ affectedRows: 1 }, [NOTE]]);
    const repository = new MysqlFriendCommandRepository(pool);

    await expect(repository.createNote(NOTE)).resolves.toEqual(NOTE);
    expect(execute).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('INSERT INTO friendship_notes'),
      [NOTE.friendshipId, NOTE.userId, NOTE.message],
    );
    expect(execute).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('FROM friendship_notes'),
      [NOTE.friendshipId, NOTE.userId],
    );
  });

  it('個別メモ作成のduplicate entryをnullへ変換する', async () => {
    const duplicateError = Object.assign(new Error('duplicate'), {
      code: 'ER_DUP_ENTRY',
    });
    const { pool } = createMysqlPool([duplicateError]);
    const repository = new MysqlFriendCommandRepository(pool);

    await expect(repository.createNote(NOTE)).resolves.toBeNull();
  });

  it('存在する個別メモを更新してDBの日時を返す', async () => {
    const updatedNote = {
      ...NOTE,
      message: 'ゼミの友人',
      updatedAt: '2026-08-06 12:50:00.000000',
    };
    const { pool, execute } = createMysqlPool([
      { affectedRows: 1 },
      [updatedNote],
    ]);
    const repository = new MysqlFriendCommandRepository(pool);

    await expect(repository.updateNote(updatedNote)).resolves.toEqual(
      updatedNote,
    );
    expect(execute).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('UPDATE friendship_notes'),
      [updatedNote.message, updatedNote.friendshipId, updatedNote.userId],
    );
  });

  it('存在しない個別メモの更新はnullを返す', async () => {
    const { pool, execute } = createMysqlPool([{ affectedRows: 0 }, []]);
    const repository = new MysqlFriendCommandRepository(pool);

    await expect(repository.updateNote(NOTE)).resolves.toBeNull();
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('既存メモと同じ文言への更新も保存済みメモを返す', async () => {
    const { pool, execute } = createMysqlPool([{ affectedRows: 0 }, [NOTE]]);
    const repository = new MysqlFriendCommandRepository(pool);

    await expect(repository.updateNote(NOTE)).resolves.toEqual(NOTE);
    expect(execute).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('FROM friendship_notes'),
      [NOTE.friendshipId, NOTE.userId],
    );
  });

  it('個別メモを冪等に削除する', async () => {
    const { pool, execute } = createMysqlPool([{ affectedRows: 0 }]);
    const repository = new MysqlFriendCommandRepository(pool);

    await expect(
      repository.deleteNote({
        friendshipId: NOTE.friendshipId,
        userId: NOTE.userId,
      }),
    ).resolves.toBeUndefined();
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM friendship_notes'),
      [NOTE.friendshipId, NOTE.userId],
    );
  });
});
