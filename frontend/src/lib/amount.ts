// 金額入力欄の共通ルール。送金画面（単一相手）と請求画面（複数相手）で同じ判定を使う。
// backendのamount制約（正の安全整数）と揃えている。

export const AMOUNT_TOO_LARGE_MESSAGE = '入力できる金額の桁数を超えています';

/** 金額入力欄が受け付ける文字列か。空文字（未入力）と半角数字のみを許可する。 */
export function isAmountInputValue(value: string): boolean {
  return value === '' || /^[0-9]+$/.test(value);
}

/** 未入力は「エラーではないが送信もできない」状態として扱うため、空文字を返す。 */
export function getAmountError(value: string): string {
  if (value === '') {
    return '';
  }
  return Number.isSafeInteger(Number(value)) ? '' : AMOUNT_TOO_LARGE_MESSAGE;
}

/** 送信できる金額か。0円と未入力は送信できない。 */
export function isSubmittableAmount(value: string): boolean {
  const numeric = Number(value);
  return value !== '' && Number.isSafeInteger(numeric) && numeric > 0;
}
