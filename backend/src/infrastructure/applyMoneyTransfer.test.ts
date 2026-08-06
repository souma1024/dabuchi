import { describe, expect, it } from 'vitest';

import {
  InsufficientBalanceError,
  TransferParticipantNotFoundError,
} from '../application/createTransfer.js';
import { createTransactionalMysqlPool } from '../test/factories/mysqlPoolFactory.js';
import { applyMoneyTransfer } from './applyMoneyTransfer.js';

const PAYER = '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001';
const PAYEE = '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf002';

function balanceRow(id: string, balance: number | string) {
  return { id, balance };
}

describe('applyMoneyTransfer', () => {
  describe('成功', () => {
    it('両者をロックし、支払人を減算・受取人を加算し、履歴を記録する', async () => {
      const { connection, execute } = createTransactionalMysqlPool([
        [balanceRow(PAYER, 5000), balanceRow(PAYEE, 200)],
        { affectedRows: 1 },
        { affectedRows: 1 },
        { insertId: 99 },
      ]);

      const applied = await applyMoneyTransfer(connection, {
        payerId: PAYER,
        payeeId: PAYEE,
        amount: 1500,
        idempotencyKey: 'idem-1',
      });

      expect(applied).toEqual({
        id: 99,
        payerId: PAYER,
        payeeId: PAYEE,
        amount: 1500,
      });

      const calls = execute.mock.calls;
      expect(calls).toHaveLength(4);
      // 1) 両者を単一の SELECT ... FOR UPDATE でまとめてロック
      expect(calls[0]?.[0]).toContain('FOR UPDATE');
      expect(calls[0]?.[1]).toEqual([PAYER, PAYEE]);
      // 2) 支払人を減算
      expect(calls[1]?.[0]).toContain('balance = balance - ?');
      expect(calls[1]?.[1]).toEqual([1500, PAYER]);
      // 3) 受取人を加算
      expect(calls[2]?.[0]).toContain('balance = balance + ?');
      expect(calls[2]?.[1]).toEqual([1500, PAYEE]);
      // 4) 履歴を記録（冪等キー付き）
      expect(calls[3]?.[0]).toContain('INSERT INTO transfers');
      expect(calls[3]?.[1]).toEqual([PAYER, PAYEE, 1500, 'idem-1']);
    });

    it('idempotencyKey 未指定なら NULL で履歴を記録する', async () => {
      const { connection, execute } = createTransactionalMysqlPool([
        [balanceRow(PAYER, 5000), balanceRow(PAYEE, 200)],
        { affectedRows: 1 },
        { affectedRows: 1 },
        { insertId: 7 },
      ]);

      await applyMoneyTransfer(connection, {
        payerId: PAYER,
        payeeId: PAYEE,
        amount: 300,
      });

      expect(execute.mock.calls[3]?.[1]).toEqual([PAYER, PAYEE, 300, null]);
    });

    it('残高がちょうど送金額と等しくても成功する（境界値）', async () => {
      const { connection } = createTransactionalMysqlPool([
        [balanceRow(PAYER, 1500), balanceRow(PAYEE, 0)],
        { affectedRows: 1 },
        { affectedRows: 1 },
        { insertId: 1 },
      ]);

      await expect(
        applyMoneyTransfer(connection, {
          payerId: PAYER,
          payeeId: PAYEE,
          amount: 1500,
        }),
      ).resolves.toMatchObject({ id: 1 });
    });

    it('SELECT結果が逆順で返っても支払人/受取人を正しく解決する', async () => {
      const { connection } = createTransactionalMysqlPool([
        [balanceRow(PAYEE, 200), balanceRow(PAYER, 5000)],
        { affectedRows: 1 },
        { affectedRows: 1 },
        { insertId: 2 },
      ]);

      await expect(
        applyMoneyTransfer(connection, {
          payerId: PAYER,
          payeeId: PAYEE,
          amount: 1500,
        }),
      ).resolves.toMatchObject({ id: 2 });
    });

    it('BIN_TO_UUIDが大文字のUUIDを返しても大小無視で解決する', async () => {
      const { connection } = createTransactionalMysqlPool([
        [balanceRow(PAYER.toUpperCase(), 5000), balanceRow(PAYEE, 200)],
        { affectedRows: 1 },
        { affectedRows: 1 },
        { insertId: 3 },
      ]);

      await expect(
        applyMoneyTransfer(connection, {
          payerId: PAYER,
          payeeId: PAYEE,
          amount: 1500,
        }),
      ).resolves.toMatchObject({ id: 3 });
    });

    it('残高がBIGINT文字列で返っても数値として比較して成功する', async () => {
      const { connection } = createTransactionalMysqlPool([
        [balanceRow(PAYER, '5000'), balanceRow(PAYEE, '200')],
        { affectedRows: 1 },
        { affectedRows: 1 },
        { insertId: 4 },
      ]);

      await expect(
        applyMoneyTransfer(connection, {
          payerId: PAYER,
          payeeId: PAYEE,
          amount: 1500,
        }),
      ).resolves.toMatchObject({ id: 4 });
    });
  });

  describe('検証エラー（残高を一切変更しない）', () => {
    it('受取人が見つからなければ TransferParticipantNotFoundError', async () => {
      const { connection, execute } = createTransactionalMysqlPool([
        [balanceRow(PAYER, 5000)],
      ]);

      await expect(
        applyMoneyTransfer(connection, {
          payerId: PAYER,
          payeeId: PAYEE,
          amount: 1500,
        }),
      ).rejects.toBeInstanceOf(TransferParticipantNotFoundError);
      expect(execute).toHaveBeenCalledTimes(1);
    });

    it('支払人が見つからなければ TransferParticipantNotFoundError', async () => {
      const { connection, execute } = createTransactionalMysqlPool([
        [balanceRow(PAYEE, 200)],
      ]);

      await expect(
        applyMoneyTransfer(connection, {
          payerId: PAYER,
          payeeId: PAYEE,
          amount: 1500,
        }),
      ).rejects.toBeInstanceOf(TransferParticipantNotFoundError);
      expect(execute).toHaveBeenCalledTimes(1);
    });

    it('両者とも見つからなければ TransferParticipantNotFoundError', async () => {
      const { connection, execute } = createTransactionalMysqlPool([[]]);

      await expect(
        applyMoneyTransfer(connection, {
          payerId: PAYER,
          payeeId: PAYEE,
          amount: 1500,
        }),
      ).rejects.toBeInstanceOf(TransferParticipantNotFoundError);
      expect(execute).toHaveBeenCalledTimes(1);
    });

    it('残高が不足していれば InsufficientBalanceError', async () => {
      const { connection, execute } = createTransactionalMysqlPool([
        [balanceRow(PAYER, 1499), balanceRow(PAYEE, 200)],
      ]);

      await expect(
        applyMoneyTransfer(connection, {
          payerId: PAYER,
          payeeId: PAYEE,
          amount: 1500,
        }),
      ).rejects.toBeInstanceOf(InsufficientBalanceError);
      expect(execute).toHaveBeenCalledTimes(1);
    });

    it('残高がBIGINT文字列でも不足を検出する', async () => {
      const { connection, execute } = createTransactionalMysqlPool([
        [balanceRow(PAYER, '1000'), balanceRow(PAYEE, '200')],
      ]);

      await expect(
        applyMoneyTransfer(connection, {
          payerId: PAYER,
          payeeId: PAYEE,
          amount: 1500,
        }),
      ).rejects.toBeInstanceOf(InsufficientBalanceError);
      expect(execute).toHaveBeenCalledTimes(1);
    });
  });
});
