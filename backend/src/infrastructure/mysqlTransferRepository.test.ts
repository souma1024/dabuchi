import { describe, expect, it } from 'vitest';

import {
  InsufficientBalanceError,
  TransferParticipantNotFoundError,
} from '../application/createTransfer.js';
import { createTransactionalMysqlPool } from '../test/factories/mysqlPoolFactory.js';
import { MysqlTransferRepository } from './mysqlTransferRepository.js';

const SENDER = '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001';
const RECIPIENT = '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf002';

function balances(senderBalance: number, recipientBalance: number) {
  return [
    { id: SENDER, balance: senderBalance },
    { id: RECIPIENT, balance: recipientBalance },
  ];
}

function withCode(message: string, code: string): Error {
  return Object.assign(new Error(message), { code });
}

const deadlockError = () => withCode('deadlock found', 'ER_LOCK_DEADLOCK');
const lockTimeoutError = () =>
  withCode('lock wait timeout', 'ER_LOCK_WAIT_TIMEOUT');
const duplicateKeyError = () => withCode('duplicate entry', 'ER_DUP_ENTRY');

describe('MysqlTransferRepository', () => {
  describe('送金の反映', () => {
    it('残高を移動して送金を保存し、トランザクションをcommitする', async () => {
      const { pool, beginTransaction, commit, rollback, release } =
        createTransactionalMysqlPool([
          balances(5000, 200),
          { affectedRows: 1 },
          { affectedRows: 1 },
          { insertId: 42 },
        ]);
      const repository = new MysqlTransferRepository(pool);

      await expect(
        repository.save({
          senderId: SENDER,
          recipientId: RECIPIENT,
          amount: 1500,
        }),
      ).resolves.toEqual({
        id: 42,
        senderId: SENDER,
        recipientId: RECIPIENT,
        amount: 1500,
      });

      expect(beginTransaction).toHaveBeenCalledTimes(1);
      expect(commit).toHaveBeenCalledTimes(1);
      expect(rollback).not.toHaveBeenCalled();
      expect(release).toHaveBeenCalledTimes(1);
    });

    it('相手が存在しなければrollbackし、TransferParticipantNotFoundErrorを投げる', async () => {
      const { pool, commit, rollback, release } = createTransactionalMysqlPool([
        [{ id: SENDER, balance: 5000 }], // recipient が無い
      ]);
      const repository = new MysqlTransferRepository(pool);

      await expect(
        repository.save({
          senderId: SENDER,
          recipientId: RECIPIENT,
          amount: 1500,
        }),
      ).rejects.toBeInstanceOf(TransferParticipantNotFoundError);

      expect(commit).not.toHaveBeenCalled();
      expect(rollback).toHaveBeenCalledTimes(1);
      expect(release).toHaveBeenCalledTimes(1);
    });

    it('残高不足ならrollbackし、InsufficientBalanceErrorを投げる', async () => {
      const { pool, commit, rollback, release } = createTransactionalMysqlPool([
        balances(1000, 200),
      ]);
      const repository = new MysqlTransferRepository(pool);

      await expect(
        repository.save({
          senderId: SENDER,
          recipientId: RECIPIENT,
          amount: 1500,
        }),
      ).rejects.toBeInstanceOf(InsufficientBalanceError);

      expect(commit).not.toHaveBeenCalled();
      expect(rollback).toHaveBeenCalledTimes(1);
      expect(release).toHaveBeenCalledTimes(1);
    });

    it('想定外のDBエラーは再試行せず、rollbackして投げ直す', async () => {
      const { pool, getConnection, beginTransaction, rollback, release } =
        createTransactionalMysqlPool([withCode('boom', 'ER_UNKNOWN')]);
      const repository = new MysqlTransferRepository(pool);

      await expect(
        repository.save({
          senderId: SENDER,
          recipientId: RECIPIENT,
          amount: 1500,
        }),
      ).rejects.toMatchObject({ code: 'ER_UNKNOWN' });

      // 再試行しない: 接続もトランザクションも1回だけ。
      expect(getConnection).toHaveBeenCalledTimes(1);
      expect(beginTransaction).toHaveBeenCalledTimes(1);
      expect(rollback).toHaveBeenCalledTimes(1);
      expect(release).toHaveBeenCalledTimes(1);
    });
  });

  describe('冪等性', () => {
    it('同一冪等キーが既に確定済みなら、残高を動かさず既存の送金を返す', async () => {
      const { pool, execute, commit, rollback } = createTransactionalMysqlPool([
        [{ id: 7, senderId: SENDER, recipientId: RECIPIENT, amount: 800 }],
      ]);
      const repository = new MysqlTransferRepository(pool);

      await expect(
        repository.save({
          senderId: SENDER,
          recipientId: RECIPIENT,
          amount: 800,
          idempotencyKey: 'idem-existing',
        }),
      ).resolves.toEqual({
        id: 7,
        senderId: SENDER,
        recipientId: RECIPIENT,
        amount: 800,
      });

      // 冪等キーの照会1回のみ。残高UPDATEやINSERTは行わない。
      expect(execute).toHaveBeenCalledTimes(1);
      expect(commit).toHaveBeenCalledTimes(1);
      expect(rollback).not.toHaveBeenCalled();
    });

    it('冪等キーが未使用なら、キー付きで送金を記録する', async () => {
      const { pool, execute, commit } = createTransactionalMysqlPool([
        [], // 冪等キー照会: 未存在
        balances(5000, 200),
        { affectedRows: 1 },
        { affectedRows: 1 },
        { insertId: 55 },
      ]);
      const repository = new MysqlTransferRepository(pool);

      const saved = await repository.save({
        senderId: SENDER,
        recipientId: RECIPIENT,
        amount: 1500,
        idempotencyKey: 'idem-new',
      });

      expect(saved).toEqual({
        id: 55,
        senderId: SENDER,
        recipientId: RECIPIENT,
        amount: 1500,
      });
      expect(commit).toHaveBeenCalledTimes(1);
      const lastCall = execute.mock.calls.at(-1);
      expect(lastCall?.[0]).toContain('INSERT INTO transfers');
      expect(lastCall?.[1]).toEqual([SENDER, RECIPIENT, 1500, 'idem-new']);
    });

    it('同時実行で一意制約に弾かれたら、rollbackして先勝ちの送金を返す', async () => {
      const { pool, commit, rollback } = createTransactionalMysqlPool([
        [], // 冪等キー照会: 未存在
        balances(5000, 200),
        { affectedRows: 1 },
        { affectedRows: 1 },
        duplicateKeyError(), // INSERT が一意制約で失敗
        [{ id: 9, senderId: SENDER, recipientId: RECIPIENT, amount: 1500 }], // 先勝ちの照会
      ]);
      const repository = new MysqlTransferRepository(pool);

      await expect(
        repository.save({
          senderId: SENDER,
          recipientId: RECIPIENT,
          amount: 1500,
          idempotencyKey: 'idem-race',
        }),
      ).resolves.toEqual({
        id: 9,
        senderId: SENDER,
        recipientId: RECIPIENT,
        amount: 1500,
      });

      expect(commit).not.toHaveBeenCalled();
      expect(rollback).toHaveBeenCalledTimes(1);
    });

    it('一意制約エラーでも先勝ちが見つからなければ、そのエラーを投げる', async () => {
      const { pool } = createTransactionalMysqlPool([
        [], // 冪等キー照会: 未存在
        balances(5000, 200),
        { affectedRows: 1 },
        { affectedRows: 1 },
        duplicateKeyError(), // INSERT が一意制約で失敗
        [], // 先勝ち照会でも見つからない
      ]);
      const repository = new MysqlTransferRepository(pool);

      await expect(
        repository.save({
          senderId: SENDER,
          recipientId: RECIPIENT,
          amount: 1500,
          idempotencyKey: 'idem-race',
        }),
      ).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
    });
  });

  describe('再試行', () => {
    it('デッドロックはトランザクション全体を再試行して成功する', async () => {
      const { pool, beginTransaction, commit, rollback, release } =
        createTransactionalMysqlPool([
          deadlockError(), // 1回目: SELECT FOR UPDATE でデッドロック
          balances(5000, 200),
          { affectedRows: 1 },
          { affectedRows: 1 },
          { insertId: 61 },
        ]);
      const repository = new MysqlTransferRepository(pool);

      const saved = await repository.save({
        senderId: SENDER,
        recipientId: RECIPIENT,
        amount: 1500,
      });

      expect(saved.id).toBe(61);
      expect(beginTransaction).toHaveBeenCalledTimes(2);
      expect(rollback).toHaveBeenCalledTimes(1);
      expect(commit).toHaveBeenCalledTimes(1);
      expect(release).toHaveBeenCalledTimes(2);
    });

    it('ロック待ちタイムアウトも再試行対象として扱う', async () => {
      const { pool, beginTransaction, commit } = createTransactionalMysqlPool([
        lockTimeoutError(),
        balances(5000, 200),
        { affectedRows: 1 },
        { affectedRows: 1 },
        { insertId: 62 },
      ]);
      const repository = new MysqlTransferRepository(pool);

      await expect(
        repository.save({
          senderId: SENDER,
          recipientId: RECIPIENT,
          amount: 1500,
        }),
      ).resolves.toMatchObject({ id: 62 });
      expect(beginTransaction).toHaveBeenCalledTimes(2);
      expect(commit).toHaveBeenCalledTimes(1);
    });

    it('上限まで再試行しても解消しなければデッドロックエラーを投げる', async () => {
      const { pool, beginTransaction, rollback, release, getConnection } =
        createTransactionalMysqlPool([
          deadlockError(),
          deadlockError(),
          deadlockError(),
        ]);
      const repository = new MysqlTransferRepository(pool);

      await expect(
        repository.save({
          senderId: SENDER,
          recipientId: RECIPIENT,
          amount: 1500,
        }),
      ).rejects.toMatchObject({ code: 'ER_LOCK_DEADLOCK' });

      // 3回試行して諦める。各試行でrollbackとreleaseを行う。
      expect(getConnection).toHaveBeenCalledTimes(3);
      expect(beginTransaction).toHaveBeenCalledTimes(3);
      expect(rollback).toHaveBeenCalledTimes(3);
      expect(release).toHaveBeenCalledTimes(3);
    });
  });
});
