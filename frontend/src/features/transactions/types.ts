import type { Counterparty } from '../../types/user';

// 相手の形は請求一覧と同じため、共有型を使う。
export type { Counterparty };

/** お金の向き。sentは自分が送った、receivedは自分が受け取った。 */
export type TransactionDirection = 'sent' | 'received';

/**
 * 取引履歴の1件。
 * バックエンド GET /api/users/:userId/transactions のレスポンス要素に対応する
 * （Issue #18 のResponse案）。API連携時に型を変えずに差し替えられるようにしている。
 */
export interface Transaction {
  /**
   * 取引ID。APIはBIGINTを文字列で返すため、桁溢れを避けて数値化せずそのまま扱う。
   */
  id: string;
  counterparty: Counterparty;
  /** 円単位の正の整数。 */
  amount: number;
  direction: TransactionDirection;
  /** ISO 8601（UTC）の取引日時（例: 2026-08-05T01:00:00.000Z）。表示時にJSTへ変換する。 */
  createdAt: string;
}

/** 取引履歴の1ページ分。 */
export interface TransactionPage {
  transactions: Transaction[];
  /** 次ページが無ければnull。 */
  nextCursor: string | null;
}
