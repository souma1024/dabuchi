import { describe, expect, it } from 'vitest';

import { InsufficientBalanceError } from '../../application/createTransfer.js';
import {
  PaymentRequestAlreadyRespondedError,
  PaymentRequestForbiddenError,
  PaymentRequestNotFoundError,
} from '../../application/errors/paymentRequestErrors.js';
import { createMysqlPool } from '../../test/factories/mysqlPoolFactory.js';
import { MysqlPaymentRequestCommandRepository } from './mysqlPaymentRequestCommandRepository.js';

const PAYMENT_REQUEST_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const REQUESTER_ID = '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf002';
const RECIPIENT_ID = '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001';

const RESPONDED_AT = '2026-08-06 02:00:00.000000';

function pendingRow(overrides = {}) {
  return {
    id: PAYMENT_REQUEST_ID,
    requesterId: REQUESTER_ID,
    recipientId: RECIPIENT_ID,
    amount: 3000,
    status: 'pending',
    respondedAt: null,
    respondedBy: null,
    ...overrides,
  };
}

/**
 * 既に応答が確定している行。冪等リプレイの検証に使う。
 * 既定は被請求者が終わらせた行。null を明示すると、V8のCHECK制約では
 * ありえない「決着済みなのに終わらせた人が分からない」行を表す。
 */
function respondedRow(
  status: 'accepted' | 'rejected',
  respondedBy: string | null = RECIPIENT_ID,
) {
  return pendingRow({ status, respondedAt: RESPONDED_AT, respondedBy });
}

function mysqlError(code: string) {
  return Object.assign(new Error(code), { code });
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

function sqlAt2(call: unknown[]) {
  return typeof call[0] === 'string' ? call[0] : '';
}

describe('MysqlPaymentRequestCommandRepository', () => {
  it('承認は残高を動かし、状態と残高を返す', async () => {
    const { pool, connection } = createMysqlPool(acceptResults());

    const result = await new MysqlPaymentRequestCommandRepository(pool).respond(
      {
        paymentRequestId: PAYMENT_REQUEST_ID,
        currentUserInternalId: RECIPIENT_ID,
        action: 'accept',
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
      action: 'accept',
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
      action: 'accept',
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
        action: 'reject',
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
      action: 'reject',
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
        action: 'accept',
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
        action: 'accept',
      }),
    ).rejects.toBeInstanceOf(PaymentRequestForbiddenError);
    expect(connection.commit).not.toHaveBeenCalled();
  });

  // 認可を状態判定より先に行うことを固定する。順序が逆になると、当事者でない人が
  // 403と409の違いから請求の状態を推測できてしまう。
  it.each(['accepted', 'rejected'] as const)(
    '既に%sでも、当事者でなければ状態を明かさず403用errorにする',
    async (status) => {
      const { pool, connection } = createMysqlPool([[respondedRow(status)]]);

      await expect(
        new MysqlPaymentRequestCommandRepository(pool).respond({
          paymentRequestId: PAYMENT_REQUEST_ID,
          // 請求者は承認できない。決着済みかどうかより先に弾く。
          currentUserInternalId: REQUESTER_ID,
          action: 'accept',
        }),
      ).rejects.toBeInstanceOf(PaymentRequestForbiddenError);
      expect(connection.commit).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['accepted', 'reject'],
    ['rejected', 'accept'],
  ] as const)(
    '既に%sなら逆向きの%sは409用errorにする',
    async (status, action) => {
      const { pool, connection } = createMysqlPool([[respondedRow(status)]]);

      await expect(
        new MysqlPaymentRequestCommandRepository(pool).respond({
          paymentRequestId: PAYMENT_REQUEST_ID,
          currentUserInternalId: RECIPIENT_ID,
          action,
        }),
      ).rejects.toBeInstanceOf(PaymentRequestAlreadyRespondedError);
      expect(connection.commit).not.toHaveBeenCalled();
    },
  );

  // COMMITはMySQL側で通ったのに応答が届かず、clientが再送する場合の収束。
  it('承認済みへ再度acceptすると、送金せず確定済みの結果を返す', async () => {
    const { pool, execute } = createMysqlPool([
      [respondedRow('accepted')],
      [{ balance: 117000 }],
    ]);

    const result = await new MysqlPaymentRequestCommandRepository(pool).respond(
      {
        paymentRequestId: PAYMENT_REQUEST_ID,
        currentUserInternalId: RECIPIENT_ID,
        action: 'accept',
      },
    );

    expect(result).toEqual({
      id: PAYMENT_REQUEST_ID,
      amount: 3000,
      status: 'accepted',
      respondedAt: RESPONDED_AT,
      recipientBalance: 117000,
    });
    // 残高更新もtransfersへのINSERTも行わない。
    expect(
      execute.mock.calls.some((call) =>
        /UPDATE users|INSERT INTO transfers|UPDATE payment_requests/.test(
          sqlAt2(call),
        ),
      ),
    ).toBe(false);
  });

  it('拒否済みへ再度rejectすると、残高を読まず確定済みの結果を返す', async () => {
    const { pool, execute } = createMysqlPool([[respondedRow('rejected')]]);

    const result = await new MysqlPaymentRequestCommandRepository(pool).respond(
      {
        paymentRequestId: PAYMENT_REQUEST_ID,
        currentUserInternalId: RECIPIENT_ID,
        action: 'reject',
      },
    );

    expect(result.status).toBe('rejected');
    expect(result.respondedAt).toBe(RESPONDED_AT);
    expect(result.recipientBalance).toBeNull();
    expect(execute).toHaveBeenCalledOnce();
  });

  it('非pendingなのにresponded_atが無ければ不変条件違反として失敗する', async () => {
    const { pool, connection } = createMysqlPool([
      // responded_by は満たしたうえで、responded_at だけが欠けた行にする。
      [
        pendingRow({
          status: 'accepted',
          respondedAt: null,
          respondedBy: RECIPIENT_ID,
        }),
      ],
    ]);

    await expect(
      new MysqlPaymentRequestCommandRepository(pool).respond({
        paymentRequestId: PAYMENT_REQUEST_ID,
        currentUserInternalId: RECIPIENT_ID,
        action: 'accept',
      }),
    ).rejects.toThrow(/no responded_at/);
    expect(connection.commit).not.toHaveBeenCalled();
  });

  it('UPDATEが1行に当たらなければcommitせず409用errorにする', async () => {
    const { pool, connection } = createMysqlPool([
      [pendingRow()],
      { affectedRows: 0 },
    ]);

    await expect(
      new MysqlPaymentRequestCommandRepository(pool).respond({
        paymentRequestId: PAYMENT_REQUEST_ID,
        currentUserInternalId: RECIPIENT_ID,
        action: 'reject',
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
        action: 'accept',
      }),
    ).rejects.toBeInstanceOf(InsufficientBalanceError);
    expect(connection.rollback).toHaveBeenCalled();
    expect(connection.commit).not.toHaveBeenCalled();
  });

  it('残高を動かした後にUPDATEが0件なら、rollbackしてcommitしない', async () => {
    const { pool, connection, execute } = createMysqlPool([
      [pendingRow()],
      [
        { id: RECIPIENT_ID, balance: 120000 },
        { id: REQUESTER_ID, balance: 5000 },
      ],
      {}, // 支払人の残高を減らす
      {}, // 受取人の残高を増やす
      { insertId: 42 }, // transfers への記録
      { affectedRows: 0 }, // 請求の状態更新が当たらない
    ]);

    await expect(
      new MysqlPaymentRequestCommandRepository(pool).respond({
        paymentRequestId: PAYMENT_REQUEST_ID,
        currentUserInternalId: RECIPIENT_ID,
        action: 'accept',
      }),
    ).rejects.toBeInstanceOf(PaymentRequestAlreadyRespondedError);

    // 残高移動は実行済みだが、commitしないので巻き戻る。
    expect(sqlAt(execute, 2)).toContain('balance = balance - ?');
    expect(connection.rollback).toHaveBeenCalled();
    expect(connection.commit).not.toHaveBeenCalled();
  });

  it.each(['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT'])(
    '%sならtransactionごと再試行して成功する',
    async (code) => {
      const { pool, connection, getConnection } = createMysqlPool([
        [pendingRow()],
        mysqlError(code), // 1回目のUPDATEが一時的エラーで失敗
        [pendingRow()], // 2回目の試行
        { affectedRows: 1 },
        [{ respondedAt: RESPONDED_AT }],
      ]);

      const result = await new MysqlPaymentRequestCommandRepository(
        pool,
      ).respond({
        paymentRequestId: PAYMENT_REQUEST_ID,
        currentUserInternalId: RECIPIENT_ID,
        action: 'reject',
      });

      expect(result.status).toBe('rejected');
      expect(getConnection).toHaveBeenCalledTimes(2);
      expect(connection.rollback).toHaveBeenCalledOnce();
      expect(connection.commit).toHaveBeenCalledOnce();
    },
  );

  it('一時的エラーが3回続いたら元のerrorを投げる', async () => {
    const deadlock = mysqlError('ER_LOCK_DEADLOCK');
    const { pool, connection, getConnection } = createMysqlPool([
      [pendingRow()],
      deadlock,
      [pendingRow()],
      deadlock,
      [pendingRow()],
      deadlock,
    ]);

    await expect(
      new MysqlPaymentRequestCommandRepository(pool).respond({
        paymentRequestId: PAYMENT_REQUEST_ID,
        currentUserInternalId: RECIPIENT_ID,
        action: 'reject',
      }),
    ).rejects.toBe(deadlock);
    expect(getConnection).toHaveBeenCalledTimes(3);
    expect(connection.commit).not.toHaveBeenCalled();
  });

  it('接続断などの一時的でないerrorは再試行しない', async () => {
    const connectionLost = mysqlError('PROTOCOL_CONNECTION_LOST');
    const { pool, connection, getConnection } = createMysqlPool([
      [pendingRow()],
      connectionLost,
    ]);

    await expect(
      new MysqlPaymentRequestCommandRepository(pool).respond({
        paymentRequestId: PAYMENT_REQUEST_ID,
        currentUserInternalId: RECIPIENT_ID,
        action: 'reject',
      }),
    ).rejects.toBe(connectionLost);
    expect(getConnection).toHaveBeenCalledOnce();
    expect(connection.rollback).toHaveBeenCalledOnce();
    expect(connection.commit).not.toHaveBeenCalled();
  });

  it('承認後に残高行が取れなければcommitせず失敗する', async () => {
    const { pool, connection } = createMysqlPool([
      [pendingRow()],
      [
        { id: RECIPIENT_ID, balance: 120000 },
        { id: REQUESTER_ID, balance: 5000 },
      ],
      {},
      {},
      { insertId: 42 },
      { affectedRows: 1 },
      [{ respondedAt: RESPONDED_AT }],
      [], // 残高が読めない
    ]);

    await expect(
      new MysqlPaymentRequestCommandRepository(pool).respond({
        paymentRequestId: PAYMENT_REQUEST_ID,
        currentUserInternalId: RECIPIENT_ID,
        action: 'accept',
      }),
    ).rejects.toThrow(/disappeared during the response/);
    expect(connection.rollback).toHaveBeenCalled();
    expect(connection.commit).not.toHaveBeenCalled();
  });

  it('承認では被請求者をresponded_byとして記録する', async () => {
    const { pool, execute } = createMysqlPool(acceptResults());

    await new MysqlPaymentRequestCommandRepository(pool).respond({
      paymentRequestId: PAYMENT_REQUEST_ID,
      currentUserInternalId: RECIPIENT_ID,
      action: 'accept',
    });

    expect(sqlAt(execute, 5)).toContain('responded_by = UUID_TO_BIN(?)');
    expect(execute.mock.calls[5]?.[1]).toEqual([
      'accepted',
      RECIPIENT_ID,
      PAYMENT_REQUEST_ID,
    ]);
  });

  describe('取り消し', () => {
    it('請求者が取り消すとrejectedになり、responded_byは請求者になる', async () => {
      const { pool, execute } = createMysqlPool(rejectResults());

      const result = await new MysqlPaymentRequestCommandRepository(
        pool,
      ).respond({
        paymentRequestId: PAYMENT_REQUEST_ID,
        currentUserInternalId: REQUESTER_ID,
        action: 'cancel',
      });

      expect(result.status).toBe('rejected');
      expect(result.recipientBalance).toBeNull();
      // 拒否と同じrejectedだが、responded_byが請求者である点だけが違う。
      expect(execute.mock.calls[1]?.[1]).toEqual([
        'rejected',
        REQUESTER_ID,
        PAYMENT_REQUEST_ID,
      ]);
    });

    it('取り消しでは残高を動かさない', async () => {
      const { pool, execute } = createMysqlPool(rejectResults());

      await new MysqlPaymentRequestCommandRepository(pool).respond({
        paymentRequestId: PAYMENT_REQUEST_ID,
        currentUserInternalId: REQUESTER_ID,
        action: 'cancel',
      });

      expect(
        execute.mock.calls.some((call) => sqlAt2(call).includes('balance')),
      ).toBe(false);
    });

    it('被請求者による取り消しは403用errorにする', async () => {
      const { pool, connection } = createMysqlPool([[pendingRow()]]);

      await expect(
        new MysqlPaymentRequestCommandRepository(pool).respond({
          paymentRequestId: PAYMENT_REQUEST_ID,
          currentUserInternalId: RECIPIENT_ID,
          action: 'cancel',
        }),
      ).rejects.toBeInstanceOf(PaymentRequestForbiddenError);
      expect(connection.commit).not.toHaveBeenCalled();
    });

    it('請求者による承認は403用errorにする', async () => {
      const { pool, connection } = createMysqlPool([[pendingRow()]]);

      await expect(
        new MysqlPaymentRequestCommandRepository(pool).respond({
          paymentRequestId: PAYMENT_REQUEST_ID,
          currentUserInternalId: REQUESTER_ID,
          action: 'accept',
        }),
      ).rejects.toBeInstanceOf(PaymentRequestForbiddenError);
      expect(connection.commit).not.toHaveBeenCalled();
    });

    it('取り消し済みへ再度cancelすると冪等リプレイになる', async () => {
      const { pool, execute } = createMysqlPool([
        [respondedRow('rejected', REQUESTER_ID)],
      ]);

      const result = await new MysqlPaymentRequestCommandRepository(
        pool,
      ).respond({
        paymentRequestId: PAYMENT_REQUEST_ID,
        currentUserInternalId: REQUESTER_ID,
        action: 'cancel',
      });

      expect(result.status).toBe('rejected');
      expect(result.respondedAt).toBe(RESPONDED_AT);
      expect(execute).toHaveBeenCalledOnce();
    });

    // 遷移先がrejectedで一致しても、終わらせたのは請求者なので被請求者の再送ではない。
    // 200を返すと「拒否しました」と誤って表示される。
    it('請求者が取り消した請求への拒否は409用errorにする', async () => {
      const { pool, connection } = createMysqlPool([
        [respondedRow('rejected', REQUESTER_ID)],
      ]);

      await expect(
        new MysqlPaymentRequestCommandRepository(pool).respond({
          paymentRequestId: PAYMENT_REQUEST_ID,
          currentUserInternalId: RECIPIENT_ID,
          action: 'reject',
        }),
      ).rejects.toBeInstanceOf(PaymentRequestAlreadyRespondedError);
      expect(connection.commit).not.toHaveBeenCalled();
    });

    it('被請求者が拒否した請求への取り消しは409用errorにする', async () => {
      const { pool, connection } = createMysqlPool([
        [respondedRow('rejected', RECIPIENT_ID)],
      ]);

      await expect(
        new MysqlPaymentRequestCommandRepository(pool).respond({
          paymentRequestId: PAYMENT_REQUEST_ID,
          currentUserInternalId: REQUESTER_ID,
          action: 'cancel',
        }),
      ).rejects.toBeInstanceOf(PaymentRequestAlreadyRespondedError);
      expect(connection.commit).not.toHaveBeenCalled();
    });

    // V8のCHECK制約により、決着済みでresponded_byがNULLの行は作れない。
    // それでも取れたならDBの不変条件が壊れているので、誰かの再送とみなさず打ち切る。
    it.each(['reject', 'cancel'] as const)(
      '決着済みなのにresponded_byがNULLなら%sを不変条件違反として失敗させる',
      async (action) => {
        const { pool, connection } = createMysqlPool([
          [respondedRow('rejected', null)],
        ]);

        await expect(
          new MysqlPaymentRequestCommandRepository(pool).respond({
            paymentRequestId: PAYMENT_REQUEST_ID,
            currentUserInternalId:
              action === 'reject' ? RECIPIENT_ID : REQUESTER_ID,
            action,
          }),
        ).rejects.toThrow(/no responded_by/);
        expect(connection.commit).not.toHaveBeenCalled();
      },
    );
  });

  it('大文字小文字が違う内部UUIDでも被請求者として扱う', async () => {
    const { pool } = createMysqlPool(rejectResults());

    const result = await new MysqlPaymentRequestCommandRepository(pool).respond(
      {
        paymentRequestId: PAYMENT_REQUEST_ID,
        currentUserInternalId: RECIPIENT_ID.toUpperCase(),
        action: 'reject',
      },
    );

    expect(result.status).toBe('rejected');
  });
});
