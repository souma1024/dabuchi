/** 請求の状態。DBのCHECK制約 chk_payment_requests_status と一致させる。 */
export type PaymentRequestState = 'pending' | 'accepted' | 'rejected';

/** 一覧の向き。receivedは自分が請求された、sentは自分が請求した。 */
export type PaymentRequestDirection = 'received' | 'sent';

/** 被請求者の応答。pendingからの遷移先はこの2つだけ。 */
export type PaymentRequestResponse = Exclude<PaymentRequestState, 'pending'>;

/** 請求の相手。receivedなら請求者、sentなら被請求者。 */
export interface PaymentRequestCounterparty {
  id: string;
  name: string;
  profileUrl: string;
}

/** APIが返す請求1件。 */
export interface PaymentRequestSummary {
  id: string;
  counterparty: PaymentRequestCounterparty;
  amount: number;
  status: PaymentRequestState;
  createdAt: string;
  respondedAt: string | null;
}

/** repositoryが返す平坦な行。createdAtとrespondedAtはMySQLのDATETIME文字列。 */
export interface PaymentRequestRecord {
  id: string;
  counterpartyId: string;
  counterpartyName: string;
  counterpartyProfileUrl: string;
  amount: number;
  status: PaymentRequestState;
  createdAt: string;
  respondedAt: string | null;
}
