/** 対象の請求が存在しない。HTTPでは404。 */
export class PaymentRequestNotFoundError extends Error {
  constructor() {
    super('Payment request was not found.');
    this.name = 'PaymentRequestNotFoundError';
  }
}

/**
 * 現在ユーザーが被請求者でない。HTTPでは403。
 *
 * 請求者や第三者が承認・拒否しようとした場合。存在自体は隠さない。
 * 請求IDは被請求者へ一覧APIで渡しており、当てずっぽうで到達できるものではないため。
 */
export class PaymentRequestForbiddenError extends Error {
  constructor() {
    super('Only the recipient can respond to this payment request.');
    this.name = 'PaymentRequestForbiddenError';
  }
}

/**
 * 対象が既に承認・拒否済み。HTTPでは409。
 *
 * 画面側の制御だけでは防げない。一覧を読み込んだ後に別端末で処理されることが
 * あるため、二重実行を止めるのはserver側の責務。
 */
export class PaymentRequestAlreadyRespondedError extends Error {
  constructor() {
    super('Payment request has already been responded to.');
    this.name = 'PaymentRequestAlreadyRespondedError';
  }
}

/** 請求IDがUUIDでない。HTTPでは400。 */
export class InvalidPaymentRequestIdError extends Error {
  constructor() {
    super('id must be a UUID');
    this.name = 'InvalidPaymentRequestIdError';
  }
}
