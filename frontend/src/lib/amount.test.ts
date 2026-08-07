import { describe, expect, it } from 'vitest';

import {
  AMOUNT_LIMIT,
  AMOUNT_LIMIT_EXCEEDED_MESSAGE,
  AMOUNT_TOO_LARGE_MESSAGE,
  getAmountError,
  isAmountInputValue,
  isSubmittableAmount,
} from './amount';

describe('isAmountInputValue', () => {
  it('空文字と半角数字のみ受け付ける', () => {
    expect(isAmountInputValue('')).toBe(true);
    expect(isAmountInputValue('0')).toBe(true);
    expect(isAmountInputValue('80000')).toBe(true);
    expect(isAmountInputValue('12a')).toBe(false);
    expect(isAmountInputValue('-1')).toBe(false);
    expect(isAmountInputValue('１２３')).toBe(false);
  });
});

describe('getAmountError', () => {
  it('未入力はエラーにしない', () => {
    expect(getAmountError('')).toBe('');
  });

  it('安全な整数の範囲を超える金額は桁数エラー', () => {
    expect(getAmountError('9'.repeat(20))).toBe(AMOUNT_TOO_LARGE_MESSAGE);
  });

  it('上限（80,000円）ちょうどまではエラーにしない', () => {
    expect(getAmountError('1')).toBe('');
    expect(getAmountError(String(AMOUNT_LIMIT))).toBe('');
  });

  it('上限を超える金額は上限超過エラー', () => {
    expect(getAmountError(String(AMOUNT_LIMIT + 1))).toBe(
      AMOUNT_LIMIT_EXCEEDED_MESSAGE,
    );
    expect(getAmountError('999999')).toBe(AMOUNT_LIMIT_EXCEEDED_MESSAGE);
  });
});

describe('isSubmittableAmount', () => {
  it('未入力・0円は送信できない', () => {
    expect(isSubmittableAmount('')).toBe(false);
    expect(isSubmittableAmount('0')).toBe(false);
  });

  it('1円以上・上限ちょうどまでは送信できる', () => {
    expect(isSubmittableAmount('1')).toBe(true);
    expect(isSubmittableAmount(String(AMOUNT_LIMIT))).toBe(true);
  });

  it('上限を超える金額は送信できない', () => {
    expect(isSubmittableAmount(String(AMOUNT_LIMIT + 1))).toBe(false);
    expect(isSubmittableAmount('9'.repeat(20))).toBe(false);
  });
});
