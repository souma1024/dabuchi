import { describe, expect, it } from 'vitest';

import { limitClause } from './limitClause.js';

describe('limitClause', () => {
  it('整数をそのまま埋め込む', () => {
    expect(limitClause(20)).toBe('LIMIT 20');
  });

  // 埋め込む以上、数値以外が混ざらないことを型ではなく実行時に保証する。
  it.each([
    ['0', 0],
    ['負の数', -1],
    ['小数', 1.5],
    ['NaN', Number.NaN],
    ['上限超え', 1001],
  ])('不正な値を拒否する: %s', (_case, value) => {
    expect(() => limitClause(value)).toThrow(RangeError);
  });
});
