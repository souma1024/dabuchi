import type { Counterparty } from '../../types/user';

// 受けた請求なら請求者、出した請求なら被請求者。取引履歴の相手と同じ形。
export type { Counterparty };

/** 一覧の向き。receivedは自分が請求された、sentは自分が請求した。 */
export type PaymentRequestDirection = 'received' | 'sent';

/** 請求の状態。payment_requests.status のCHECK制約と一致させる。 */
export type PaymentRequestStatus = 'pending' | 'accepted' | 'rejected';

/**
 * 請求1件。
 * バックエンド GET /api/payment-requests のレスポンス要素に対応する（Issue #70）。
 * API連携時に型を変えずにクライアントを差し替えられるようにしている。
 */
export interface PaymentRequest {
  /** 請求ID（内部UUID）。 */
  id: string;
  counterparty: Counterparty;
  /** 円単位の正の整数。 */
  amount: number;
  status: PaymentRequestStatus;
  /** ISO 8601（UTC）の請求日時。表示時にJSTへ変換する。 */
  createdAt: string;
  /** 承認・拒否された日時。pendingのあいだはnull。 */
  respondedAt: string | null;
}

/** 請求一覧の1ページ分。 */
export interface PaymentRequestPage {
  requests: PaymentRequest[];
  /** 次ページが無ければnull。 */
  nextCursor: string | null;
}
