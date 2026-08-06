import { describe, expect, it } from 'vitest';

import { isForeignKeyViolation } from './mysqlError.js';

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
