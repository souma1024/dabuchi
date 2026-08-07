import type {
  PaymentRequestDirection,
  PaymentRequestRecord,
  PaymentRequestState,
} from '../../domain/paymentRequest.js';

export interface PaymentRequestCursor {
  createdAt: string;
  id: string;
}

export interface FindPaymentRequestsInput {
  /** users.id の内部UUID。公開user_idではない。 */
  currentUserInternalId: string;
  direction: PaymentRequestDirection;
  status: PaymentRequestState | null;
  cursor: PaymentRequestCursor | null;
  limit: number;
}

/**
 * 請求一覧の読み取り専用port。
 * 書き込み側のPaymentRequestRepositoryとは分けて、実装が必要なメソッドを最小限にする。
 */
export interface FindPaymentRequestByIdInput {
  paymentRequestId: string;
  /** users.id の内部UUID。公開user_idではない。 */
  currentUserInternalId: string;
}

export interface PaymentRequestListRepository {
  findPaymentRequests: (
    input: FindPaymentRequestsInput,
  ) => Promise<PaymentRequestRecord[]>;
  /**
   * 請求1件を返す。現在ユーザーが当事者でなければnull。
   * 当事者かどうかの判定をSQLの条件に含めることで、他人の請求を読めないようにする。
   */
  findPaymentRequestById: (
    input: FindPaymentRequestByIdInput,
  ) => Promise<PaymentRequestRecord | null>;
}
