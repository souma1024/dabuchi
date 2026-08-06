import type {
  PaymentRequestAction,
  PaymentRequestResponse,
} from '../../domain/paymentRequest.js';

export interface RespondToPaymentRequestInput {
  paymentRequestId: string;
  /** users.id の内部UUID。公開user_idではない。 */
  currentUserInternalId: string;
  action: PaymentRequestAction;
}

export interface RespondedPaymentRequest {
  id: string;
  amount: number;
  status: PaymentRequestResponse;
  /** MySQLのDATETIME文字列。ISO 8601への変換はusecase側で行う。 */
  respondedAt: string;
  /** 承認後の被請求者の残高。拒否・取り消しでは残高が動かないためnull。 */
  recipientBalance: number | null;
}

/**
 * 請求の状態を変える書き込み専用port。
 *
 * 「pendingか」「操作できる当事者本人か」の確認は、残高移動と同じtransactionの内側で
 * 行う必要がある（確認と更新の間に別の実行が割り込むと二重送金になる）。
 * そのため検証はimplementation側が担い、application errorを投げ返す。
 * `applyMoneyTransfer` が同じ理由で残高検証を内側に持つのと同じ形。
 */
export interface PaymentRequestCommandRepository {
  respond: (
    input: RespondToPaymentRequestInput,
  ) => Promise<RespondedPaymentRequest>;
}
