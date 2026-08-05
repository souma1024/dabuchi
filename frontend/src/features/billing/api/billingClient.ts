export interface SendBillingRequestParams {
  userId: string;
  amount: number;
}

// TODO: backend担当とエンドポイント・HTTPメソッドを確定次第、このパスを更新する（現時点は仮）。
const BILLING_REQUESTS_ENDPOINT = '/api/billing-requests';

export async function sendBillingRequest({
  userId,
  amount,
}: SendBillingRequestParams): Promise<void> {
  const response = await fetch(BILLING_REQUESTS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, amount }),
  });

  if (!response.ok) {
    throw new Error(`請求に失敗しました（status: ${response.status}）`);
  }
}
