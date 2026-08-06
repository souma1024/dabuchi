import { describe, expect, it } from 'vitest';

import { InsufficientBalanceError } from '../../application/createTransfer.js';
import {
  PaymentRequestAlreadyRespondedError,
  PaymentRequestForbiddenError,
  PaymentRequestNotFoundError,
} from '../../application/errors/paymentRequestCommandErrors.js';
import { createMysqlPool } from '../../test/factories/mysqlPoolFactory.js';
import { MysqlPaymentRequestCommandRepository } from './mysqlPaymentRequestCommandRepository.js';

const PAYMENT_REQUEST_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const REQUESTER_ID = '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf002';
const RECIPIENT_ID = '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001';

function pendingRow(overrides = {}) {
  return {
    id: PAYMENT_REQUEST_ID,
    requesterId: REQUESTER_ID,
    recipientId: RECIPIENT_ID,
    amount: 3000,
    status: 'pending',
    ...overrides,
  };
}

/** 承認1件が最後まで通るときの、execute呼び出し順に並べた戻り値。 */
function acceptResults() {
  return [
    [pendingRow()], // 請求のロック取得
    [
      { id: RECIPIENT_ID, balance: 120000 },
      { id: REQUESTER_ID, balance: 5000 },
    ], // applyMoneyTransfer の残高ロック
    {}, // 支払人の残高を減らす
    {}, // 受取人の残高を増やす
    { insertId: 42 }, // transfers への記録
    { affectedRows: 1 }, // payment_requests の状態更新
    [{ respondedAt: '2026-08-06 02:00:00.000000' }],
    [{ balance: 117000 }], // 承認後の被請求者の残高
  ];
}

function rejectResults() {
  return [
    [pendingRow()],
    { affectedRows: 1 },
    [{ respondedAt: '2026-08-06 02:00:00.000000' }],
  ];
}

function sqlAt(execute: { mock: { calls: unknown[][] } }, index: number) {
  const sql = execute.mock.calls[index]?.[0];

  return typeof sql === 'string' ? sql : '';
}

describe('MysqlPaymentRequestCommandRepository', () => {
  it('承認は残高を動かし、状態と残高を返す', async () => {
    const { pool, connection } = createMysqlPool(acceptResults());

    const result = await new MysqlPaymentRequestCommandRepository(pool).respond(
      {
        paymentRequestId: PAYMENT_REQUEST_ID,
        currentUserInternalId: RECIPIENT_ID,
        response: 'accepted',
      },
    );

    expect(result).toEqual({
      id: PAYMENT_REQUEST_ID,
      amount: 3000,
      status: 'accepted',
      respondedAt: '2026-08-06 02:00:00.000000',
      recipientBalance: 117000,
    });
    expect(connection.commit).toHaveBeenCalledOnce();
    expect(connection.release).toHaveBeenCalledOnce();
  });

  it('承認では被請求者が支払い、請求者が受け取る', async () => {
    const { pool, execute } = createMysqlPool(acceptResults());

    await new MysqlPaymentRequestCommandRepository(pool).respond({
      paymentRequestId: PAYMENT_REQUEST_ID,
      currentUserInternalId: RECIPIENT_ID,
      response: 'accepted',
    });

    // 3件目が減算、4件目が加算。被請求者から請求者への向き。
    expect(sqlAt(execute, 2)).toContain('balance = balance - ?');
    expect(execute.mock.calls[2]?.[1]).toEqual([3000, RECIPIENT_ID]);
    expect(sqlAt(execute, 3)).toContain('balance = balance + ?');
    expect(execute.mock.calls[3]?.[1]).toEqual([3000, REQUESTER_ID]);
  });

  it('請求の行をFOR UPDATEでロックしてから読む', async () => {
    const { pool, execute, connection } = createMysqlPool(acceptResults());

    await new MysqlPaymentRequestCommandRepository(pool).respond({
      paymentRequestId: PAYMENT_REQUEST_ID,
      currentUserInternalId: RECIPIENT_ID,
      response: 'accepted',
    });

    expect(connection.beginTransaction).toHaveBeenCalledOnce();
    expect(sqlAt(execute, 0)).toContain('FOR UPDATE');
    expect(sqlAt(execute, 0)).toContain('FROM payment_requests');
  });

  it('拒否は残高を動かさず、残高をnullで返す', async () => {
    const { pool, execute } = createMysqlPool(rejectResults());

    const result = await new MysqlPaymentRequestCommandRepository(pool).respond(
      {
        paymentRequestId: PAYMENT_REQUEST_ID,
        currentUserInternalId: RECIPIENT_ID,
        response: 'rejected',
      },
    );

    expect(result.status).toBe('rejected');
    expect(result.recipientBalance).toBeNull();
    expect(
      execute.mock.calls.some((call) => String(call[0]).includes('balance')),
    ).toBe(false);
  });

  it('状態更新はpendingのみを対象にする', async () => {
    const { pool, execute } = createMysqlPool(rejectResults());

    await new MysqlPaymentRequestCommandRepository(pool).respond({
      paymentRequestId: PAYMENT_REQUEST_ID,
      currentUserInternalId: RECIPIENT_ID,
      response: 'rejected',
    });

    expect(sqlAt(execute, 1)).toContain("status = 'pending'");
    expect(sqlAt(execute, 1)).toContain('responded_at = CURRENT_TIMESTAMP(6)');
  });

  it('存在しない請求は404用errorにする', async () => {
    const { pool, connection } = createMysqlPool([[]]);

    await expect(
      new MysqlPaymentRequestCommandRepository(pool).respond({
        paymentRequestId: PAYMENT_REQUEST_ID,
        currentUserInternalId: RECIPIENT_ID,
        response: 'accepted',
      }),
    ).rejects.toBeInstanceOf(PaymentRequestNotFoundError);
    expect(connection.rollback).toHaveBeenCalled();
    expect(connection.commit).not.toHaveBeenCalled();
  });

  it('被請求者以外の応答は403用errorにする', async () => {
    const { pool, connection } = createMysqlPool([[pendingRow()]]);

    await expect(
      new MysqlPaymentRequestCommandRepository(pool).respond({
        paymentRequestId: PAYMENT_REQUEST_ID,
        // 請求者自身が承認しようとした場合。
        currentUserInternalId: REQUESTER_ID,
        response: 'accepted',
      }),
    ).rejects.toBeInstanceOf(PaymentRequestForbiddenError);
    expect(connection.commit).not.toHaveBeenCalled();
  });

  it.each(['accepted', 'rejected'])(
    '既に%sなら409用errorにする',
    async (status) => {
      const { pool, connection } = createMysqlPool([[pendingRow({ status })]]);

      await expect(
        new MysqlPaymentRequestCommandRepository(pool).respond({
          paymentRequestId: PAYMENT_REQUEST_ID,
          currentUserInternalId: RECIPIENT_ID,
          response: 'accepted',
        }),
      ).rejects.toBeInstanceOf(PaymentRequestAlreadyRespondedError);
      expect(connection.commit).not.toHaveBeenCalled();
    },
  );

  it('UPDATEが1行に当たらなければcommitせず409用errorにする', async () => {
    const { pool, connection } = createMysqlPool([
      [pendingRow()],
      { affectedRows: 0 },
    ]);

    await expect(
      new MysqlPaymentRequestCommandRepository(pool).respond({
        paymentRequestId: PAYMENT_REQUEST_ID,
        currentUserInternalId: RECIPIENT_ID,
        response: 'rejected',
      }),
    ).rejects.toBeInstanceOf(PaymentRequestAlreadyRespondedError);
    expect(connection.commit).not.toHaveBeenCalled();
  });

  it('残高不足なら残高移動のerrorをそのまま伝え、commitしない', async () => {
    const { pool, connection } = createMysqlPool([
      [pendingRow()],
      [
        { id: RECIPIENT_ID, balance: 100 },
        { id: REQUESTER_ID, balance: 5000 },
      ],
    ]);

    await expect(
      new MysqlPaymentRequestCommandRepository(pool).respond({
        paymentRequestId: PAYMENT_REQUEST_ID,
        currentUserInternalId: RECIPIENT_ID,
        response: 'accepted',
      }),
    ).rejects.toBeInstanceOf(InsufficientBalanceError);
    expect(connection.rollback).toHaveBeenCalled();
    expect(connection.commit).not.toHaveBeenCalled();
  });

  it('大文字小文字が違う内部UUIDでも被請求者として扱う', async () => {
    const { pool } = createMysqlPool(rejectResults());

    const result = await new MysqlPaymentRequestCommandRepository(pool).respond(
      {
        paymentRequestId: PAYMENT_REQUEST_ID,
        currentUserInternalId: RECIPIENT_ID.toUpperCase(),
        response: 'rejected',
      },
    );

    expect(result.status).toBe('rejected');
  });
});
