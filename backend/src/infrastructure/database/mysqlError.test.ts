import { describe, expect, it } from 'vitest';

import {
  isDuplicateKeyViolation,
  isForeignKeyViolation,
  isTransientTransactionError,
} from './mysqlError.js';

describe('isForeignKeyViolation', () => {
  it('MySQLの外部キー違反を判定する', () => {
    expect(isForeignKeyViolation({ code: 'ER_NO_REFERENCED_ROW_2' })).toBe(
      true,
    );
  });

  it.each([
    ['別のMySQLエラー', { code: 'ER_DUP_ENTRY' }],
    ['codeを持たないエラー', new Error('database error')],
    ['null', null],
  ])('%sは外部キー違反として扱わない', (_label, error) => {
    expect(isForeignKeyViolation(error)).toBe(false);
  });
});

describe('isDuplicateKeyViolation', () => {
  it('MySQLの一意制約違反を判定する', () => {
    expect(isDuplicateKeyViolation({ code: 'ER_DUP_ENTRY' })).toBe(true);
  });

  it.each([
    ['別のMySQLエラー', { code: 'ER_NO_REFERENCED_ROW_2' }],
    ['codeを持たないエラー', new Error('database error')],
    ['null', null],
  ])('%sは一意制約違反として扱わない', (_label, error) => {
    expect(isDuplicateKeyViolation(error)).toBe(false);
  });
});

describe('isTransientTransactionError', () => {
  it.each([
    ['デッドロック', { code: 'ER_LOCK_DEADLOCK' }],
    ['ロック待ちタイムアウト', { code: 'ER_LOCK_WAIT_TIMEOUT' }],
  ])('%sは再試行可能な一時的エラーとして扱う', (_label, error) => {
    expect(isTransientTransactionError(error)).toBe(true);
  });

  it.each([
    ['一意制約違反', { code: 'ER_DUP_ENTRY' }],
    ['codeを持たないエラー', new Error('database error')],
    ['null', null],
  ])('%sは一時的エラーとして扱わない', (_label, error) => {
    expect(isTransientTransactionError(error)).toBe(false);
  });
});
