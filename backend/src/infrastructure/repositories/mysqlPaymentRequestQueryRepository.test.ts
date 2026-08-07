import type { Pool } from 'mysql2/promise';
import { describe, expect, it } from 'vitest';

import { createMysqlPool } from '../../test/factories/mysqlPoolFactory.js';
import { createPaymentRequestRecord } from '../../test/factories/paymentRequestQueryFactory.js';
import { MysqlPaymentRequestQueryRepository } from './mysqlPaymentRequestQueryRepository.js';

const CURRENT_USER_INTERNAL_ID = '11111111-1111-4111-8111-111111111111';

/** SQLの整形（改行・インデント）に依存せず構造だけを比較するため、空白を1つに潰す。 */
function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim();
}

function sqlOf(execute: { mock: { calls: unknown[][] } }): string {
  const sql = execute.mock.calls[0]?.[0];

  return typeof sql === 'string' ? sql : '';
}

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

describe('MysqlPaymentRequestQueryRepository', () => {
  it('receivedでは被請求者で絞り、請求者を相手として結合する', async () => {
    const { pool, execute } = createMysqlPool([[]]);
    const repository = new MysqlPaymentRequestQueryRepository(pool);

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
    const repository = new MysqlPaymentRequestQueryRepository(pool);

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
    'pr.responded_by = pr.recipient_id AS endedByMe',
    'AS createdAt',
    'AS respondedAt',
  ])('SELECT句に %s を含む', async (alias) => {
    const { pool, execute } = createMysqlPool([[]]);
    const repository = new MysqlPaymentRequestQueryRepository(pool);

    await repository.findPaymentRequests(createBaseInput());

    expect(execute).toHaveBeenCalledWith(expect.stringContaining(alias), [
      CURRENT_USER_INTERNAL_ID,
      '21',
    ]);
  });

  it('新しい順に並べる', async () => {
    const { pool, execute } = createMysqlPool([[]]);
    const repository = new MysqlPaymentRequestQueryRepository(pool);

    await repository.findPaymentRequests(createBaseInput());

    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY pr.created_at DESC, pr.id DESC'),
      [CURRENT_USER_INTERNAL_ID, '21'],
    );
  });

  it('statusを指定すると絞り込み条件と値を追加する', async () => {
    const { pool, execute } = createMysqlPool([[]]);
    const repository = new MysqlPaymentRequestQueryRepository(pool);

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
    const repository = new MysqlPaymentRequestQueryRepository(pool);
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
    const repository = new MysqlPaymentRequestQueryRepository(pool);

    await repository.findPaymentRequests(createBaseInput({ limit: 5 }));

    expect(execute).toHaveBeenCalledWith(expect.stringContaining('LIMIT ?'), [
      CURRENT_USER_INTERNAL_ID,
      '5',
    ]);
  });

  it('取得した行をrecordへ写す', async () => {
    const record = createPaymentRequestRecord(1);
    const { pool } = createMysqlPool([[record]]);
    const repository = new MysqlPaymentRequestQueryRepository(pool);

    await expect(
      repository.findPaymentRequests(createBaseInput()),
    ).resolves.toEqual([record]);
  });

  describe('findPaymentRequestById', () => {
    const PAYMENT_REQUEST_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

    function findById(pool: Pool) {
      return new MysqlPaymentRequestQueryRepository(
        pool,
      ).findPaymentRequestById({
        paymentRequestId: PAYMENT_REQUEST_ID,
        currentUserInternalId: CURRENT_USER_INTERNAL_ID,
      });
    }

    // 断片ごとの検証だとTHENとELSEの入れ替えを見逃し、相手が自分自身になる回帰を
    // 検出できない。CASE式とWHERE句は括弧まで含めて丸ごと固定する。
    it('現在ユーザーが請求者なら被請求者を、そうでなければ請求者を相手にする', async () => {
      const { pool, execute } = createMysqlPool([[]]);

      await findById(pool);

      expect(normalizeSql(sqlOf(execute))).toContain(
        'counterparty.id = CASE' +
          ' WHEN pr.requester_id = UUID_TO_BIN(?) THEN pr.recipient_id' +
          ' ELSE pr.requester_id' +
          ' END',
      );
    });

    // 当事者でなければSQLの段階で弾き、存在の有無を呼び出し側へ漏らさない。
    // 括弧が外れるとANDとORの優先順位が変わり、他人の請求まで返るため丸ごと固定する。
    it('当事者だけを対象にする条件を含む', async () => {
      const { pool, execute } = createMysqlPool([[]]);

      await findById(pool);

      expect(normalizeSql(sqlOf(execute))).toContain(
        'WHERE pr.id = UUID_TO_BIN(?)' +
          ' AND ( pr.requester_id = UUID_TO_BIN(?)' +
          ' OR pr.recipient_id = UUID_TO_BIN(?) )',
      );
    });

    it('プレースホルダへ値を正しい順序で渡す', async () => {
      const { pool, execute } = createMysqlPool([[]]);

      await findById(pool);

      // SELECTのendedByMe、相手の判定用に1回、WHEREの請求ID、当事者判定に2回。
      // 順序がずれると他人の請求が読めてしまう。
      expect(execute.mock.calls[0]?.[1]).toEqual([
        CURRENT_USER_INTERNAL_ID,
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
