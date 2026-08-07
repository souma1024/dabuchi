/** 請求の状態。DBのCHECK制約 chk_payment_requests_status と一致させる。 */
export type PaymentRequestState = 'pending' | 'accepted' | 'rejected';

/** 一覧の向き。receivedは自分が請求された、sentは自分が請求した。 */
export type PaymentRequestDirection = 'received' | 'sent';

/** 応答後の状態。pendingからの遷移先はこの2つだけ。 */
export type PaymentRequestResponse = Exclude<PaymentRequestState, 'pending'>;

/**
 * pendingの請求を終わらせる操作。
 *
 * cancelはrejectedへ遷移する。statusのCHECK制約を変えずに取り消しを扱うため、
 * rejectedが「被請求者の拒否」と「請求者の取り消し」の両方を表す。
 * どちらの操作だったかは payment_requests.responded_by で区別する。
 */
export type PaymentRequestAction = 'accept' | 'reject' | 'cancel';

/** 操作ごとに、実行できる当事者と遷移先と残高移動の有無が決まる。 */
export const PAYMENT_REQUEST_ACTIONS = {
  accept: { actor: 'recipient', nextStatus: 'accepted', movesMoney: true },
  reject: { actor: 'recipient', nextStatus: 'rejected', movesMoney: false },
  cancel: { actor: 'requester', nextStatus: 'rejected', movesMoney: false },
} as const satisfies Record<
  PaymentRequestAction,
  {
    actor: 'requester' | 'recipient';
    nextStatus: PaymentRequestResponse;
    movesMoney: boolean;
  }
>;

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
