import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Recipient } from '../../../types/user';
import { useBillingAmounts } from './useBillingAmounts';

const recipients: Recipient[] = [
  { id: 'a', name: '佐藤次郎' },
  { id: 'b', name: '佐藤三郎' },
  { id: 'c', name: '佐々木花子' },
];

function renderUseBillingAmounts() {
  return renderHook(() => useBillingAmounts(recipients));
}

describe('useBillingAmounts', () => {
  it('初期状態はすべて未入力', () => {
    const { result } = renderUseBillingAmounts();

    expect(result.current.amounts).toEqual({});
    expect(result.current.isAutofillActive).toBe(true);
  });

  // 1文字ずつchangeが発火するため、「最初のイベントだけ」ではなく
  // 「最初に触れた欄の編集中は」全員へ配り続ける必要がある。
  it('最初に入力した欄の値を全員へ反映する', () => {
    const { result } = renderUseBillingAmounts();

    act(() => result.current.setAmount('a', '1'));
    act(() => result.current.setAmount('a', '10'));
    act(() => result.current.setAmount('a', '1000'));

    expect(result.current.amounts).toEqual({ a: '1000', b: '1000', c: '1000' });
  });

  it('別の欄を編集するとその欄だけが変わる', () => {
    const { result } = renderUseBillingAmounts();

    act(() => result.current.setAmount('a', '1000'));
    act(() => result.current.setAmount('b', '2500'));

    expect(result.current.amounts).toEqual({ a: '1000', b: '2500', c: '1000' });
    expect(result.current.isAutofillActive).toBe(false);
  });

  // オートフィルは一度だけ。個別編集が始まったら起点の欄へ戻っても再開しない。
  it('個別編集の後は起点の欄を編集しても全員へ反映しない', () => {
    const { result } = renderUseBillingAmounts();

    act(() => result.current.setAmount('a', '1000'));
    act(() => result.current.setAmount('b', '2500'));
    act(() => result.current.setAmount('a', '300'));

    expect(result.current.amounts).toEqual({ a: '300', b: '2500', c: '1000' });
  });

  it('最初に触れた欄が先頭でなくても全員へ反映する', () => {
    const { result } = renderUseBillingAmounts();

    act(() => result.current.setAmount('c', '800'));

    expect(result.current.amounts).toEqual({ a: '800', b: '800', c: '800' });
  });

  it('オートフィル中に起点の欄を空にすると全員が空になる', () => {
    const { result } = renderUseBillingAmounts();

    act(() => result.current.setAmount('a', '1000'));
    act(() => result.current.setAmount('a', ''));

    expect(result.current.amounts).toEqual({ a: '', b: '', c: '' });
  });
});
