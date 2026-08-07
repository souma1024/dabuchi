/**
 * 1回の送金・請求で指定できる金額の上限（円）。この額ちょうどは許可し、超える額は不可。
 * 想定外の高額な取引を防ぐための業務ルールで、送金（transfers）と請求（payment_requests）で
 * 共通に適用する。frontendの AMOUNT_LIMIT と値を揃える。
 */
export const AMOUNT_LIMIT = 80_000;
