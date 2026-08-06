import type { Pool } from 'mysql2/promise';
import { describe, expect, it } from 'vitest';

import { createMysqlPool } from '../../test/factories/mysqlPoolFactory.js';
import { createPaymentRequestRecord } from '../../test/factories/paymentRequestListFactory.js';
import { MysqlPaymentRequestListRepository } from './mysqlPaymentRequestListRepository.js';

const CURRENT_USER_INTERNAL_ID = '11111111-1111-4111-8111-111111111111';

function createBaseInput(overrides = {}) {
  return {
    currentUserInternalId: CURRENT_USER_INTERNAL_ID,
    direction: 'received' as const,
    status: null,
    cursor: null,
    limit: 21,
    ...overrides,
  };
}

describe('MysqlPaymentRequestListRepository', () => {
  it('receivedでは被請求者で絞り、請求者を相手として結合する', async () => {
    const { pool, execute } = createMysqlPool([[]]);
    const repository = new MysqlPaymentRequestListRepository(pool);

    await repository.findPaymentRequests(createBaseInput());

    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining(
        'JOIN users counterparty ON counterparty.id = pr.requester_id',
      ),
      [CURRENT_USER_INTERNAL_ID, '21'],
    );
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('WHERE pr.recipient_id = UUID_TO_BIN(?)'),
      [CURRENT_USER_INTERNAL_ID, '21'],
    );
  });

  it('sentでは請求者で絞り、被請求者を相手として結合する', async () => {
    const { pool, execute } = createMysqlPool([[]]);
    const repository = new MysqlPaymentRequestListRepository(pool);

    await repository.findPaymentRequests(
      createBaseInput({ direction: 'sent' }),
    );

    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining(
        'JOIN users counterparty ON counterparty.id = pr.recipient_id',
      ),
      [CURRENT_USER_INTERNAL_ID, '21'],
    );
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('WHERE pr.requester_id = UUID_TO_BIN(?)'),
      [CURRENT_USER_INTERNAL_ID, '21'],
    );
  });

  // SELECT句のエイリアスとrecordの項目名がずれても、モックPoolでは検出できない。
  // ここで明示的に突き合わせて、名前の取り違えを型検査以外の場所でも防ぐ。
  it.each([
    'BIN_TO_UUID(pr.id) AS id',
    'BIN_TO_UUID(counterparty.id) AS counterpartyId',
    'counterparty.user_name AS counterpartyName',
    'counterparty.profile_url AS counterpartyProfileUrl',
    'pr.amount AS amount',
    'pr.status AS status',
    'AS createdAt',
    'AS respondedAt',
  ])('SELECT句に %s を含む', async (alias) => {
    const { pool, execute } = createMysqlPool([[]]);
    const repository = new MysqlPaymentRequestListRepository(pool);

    await repository.findPaymentRequests(createBaseInput());

    expect(execute).toHaveBeenCalledWith(expect.stringContaining(alias), [
      CURRENT_USER_INTERNAL_ID,
      '21',
    ]);
  });

  it('新しい順に並べる', async () => {
    const { pool, execute } = createMysqlPool([[]]);
    const repository = new MysqlPaymentRequestListRepository(pool);

    await repository.findPaymentRequests(createBaseInput());

    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY pr.created_at DESC, pr.id DESC'),
      [CURRENT_USER_INTERNAL_ID, '21'],
    );
  });

  it('statusを指定すると絞り込み条件と値を追加する', async () => {
    const { pool, execute } = createMysqlPool([[]]);
    const repository = new MysqlPaymentRequestListRepository(pool);

    await repository.findPaymentRequests(
      createBaseInput({ status: 'pending' }),
    );

    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('AND pr.status = ?'),
      [CURRENT_USER_INTERNAL_ID, 'pending', '21'],
    );
  });

  it('カーソルは降順の比較条件になる', async () => {
    const { pool, execute } = createMysqlPool([[]]);
    const repository = new MysqlPaymentRequestListRepository(pool);
    const cursor = {
      createdAt: '2026-08-04 12:00:20.000000',
      id: '00000000-0000-4000-8000-000000000020',
    };

    await repository.findPaymentRequests(createBaseInput({ cursor }));

    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('pr.created_at < ?'),
      [
        CURRENT_USER_INTERNAL_ID,
        cursor.createdAt,
        cursor.createdAt,
        cursor.id,
        '21',
      ],
    );
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('pr.id < UUID_TO_BIN(?)'),
      [
        CURRENT_USER_INTERNAL_ID,
        cursor.createdAt,
        cursor.createdAt,
        cursor.id,
        '21',
      ],
    );
  });

  // mysql2はJavaScriptのnumberをDOUBLEとして送るため、MySQLがLIMITで拒否する。
  it('LIMITは文字列で渡す', async () => {
    const { pool, execute } = createMysqlPool([[]]);
    const repository = new MysqlPaymentRequestListRepository(pool);

    await repository.findPaymentRequests(createBaseInput({ limit: 5 }));

    expect(execute).toHaveBeenCalledWith(expect.stringContaining('LIMIT ?'), [
      CURRENT_USER_INTERNAL_ID,
      '5',
    ]);
  });

  it('取得した行をrecordへ写す', async () => {
    const record = createPaymentRequestRecord(1);
    const { pool } = createMysqlPool([[record]]);
    const repository = new MysqlPaymentRequestListRepository(pool);

    await expect(
      repository.findPaymentRequests(createBaseInput()),
    ).resolves.toEqual([record]);
  });

  describe('findPaymentRequestById', () => {
    const PAYMENT_REQUEST_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

    function findById(pool: Pool) {
      return new MysqlPaymentRequestListRepository(pool).findPaymentRequestById(
        {
          paymentRequestId: PAYMENT_REQUEST_ID,
          currentUserInternalId: CURRENT_USER_INTERNAL_ID,
        },
      );
    }

    it('現在ユーザーでない側を相手として結合する', async () => {
      const { pool, execute } = createMysqlPool([[]]);

      await findById(pool);

      // directionを受け取らないため、請求者か被請求者かを行ごとに判定する。
      expect(execute).toHaveBeenCalledWith(
        expect.stringContaining('WHEN pr.requester_id = UUID_TO_BIN(?)'),
        expect.anything(),
      );
    });

    // 当事者でなければSQLの段階で弾き、存在の有無を呼び出し側へ漏らさない。
    it('当事者だけを対象にする条件を含む', async () => {
      const { pool, execute } = createMysqlPool([[]]);

      await findById(pool);

      const [sql, values] = execute.mock.calls[0] ?? [];

      expect(String(sql)).toContain('pr.requester_id = UUID_TO_BIN(?)');
      expect(String(sql)).toContain('pr.recipient_id = UUID_TO_BIN(?)');
      // 相手の判定用に1回、WHEREの請求ID、当事者判定に2回。
      expect(values).toEqual([
        CURRENT_USER_INTERNAL_ID,
        PAYMENT_REQUEST_ID,
        CURRENT_USER_INTERNAL_ID,
        CURRENT_USER_INTERNAL_ID,
      ]);
    });

    it('取得した行をrecordへ写す', async () => {
      const record = createPaymentRequestRecord(1);
      const { pool } = createMysqlPool([[record]]);

      await expect(findById(pool)).resolves.toEqual(record);
    });

    it('該当が無ければnullを返す', async () => {
      const { pool } = createMysqlPool([[]]);

      await expect(findById(pool)).resolves.toBeNull();
    });
  });
});
