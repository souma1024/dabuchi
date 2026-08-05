// 請求テーブルの想定カラム（message・ステータスは未確定のため今回のスコープ外）。
export interface BillingRequest {
  id: string;
  requesterUserId: string;
  billedUserId: string;
  amount: number;
  createdAt: string;
}
