/** 対象の請求が存在しない。HTTPでは404。 */
export class PaymentRequestNotFoundError extends Error {
  constructor() {
    super('Payment request was not found.');
    this.name = 'PaymentRequestNotFoundError';
  }
}

/**
 * 現在ユーザーが、その操作をできる当事者でない。HTTPでは403。
 *
 * 承認・拒否は被請求者だけ、取り消しは請求者だけができる。存在自体は隠さない。
 * 請求IDは当事者へAPIで渡しており、当てずっぽうで到達できるものではないため。
 */
export class PaymentRequestForbiddenError extends Error {
  constructor(actor: 'requester' | 'recipient') {
    super(`Only the ${actor} can perform this action on the payment request.`);
    this.name = 'PaymentRequestForbiddenError';
  }
}

/**
 * 対象が既に決着済みで、今回の操作を冪等な再送とみなせない。HTTPでは409。
 *
 * 画面側の制御だけでは防げない。一覧を読み込んだ後に別端末で処理されることが
 * あるため、二重実行を止めるのはserver側の責務。
 *
 * 自分が同じ操作で終わらせた請求への再送は、409ではなく冪等リプレイとして200になる。
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
