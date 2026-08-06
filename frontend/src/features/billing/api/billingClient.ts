export interface BillingRequestItem {
  recipientId: string;
  amount: number;
}

export interface SendBillingRequestsParams {
  requests: BillingRequestItem[];
}

/** backendが1回のリクエストで受け付ける被請求者の上限（createPaymentRequests.tsのMAX_REQUESTS_PER_CALL）。 */
export const MAX_BILLING_RECIPIENTS = 50;

const PAYMENT_REQUESTS_ENDPOINT = '/api/payment-requests';

// backendは複数の被請求者への一括請求を受け付ける。被請求者ごとに金額が異なるため、
// 画面で入力した分をそのままrequests配列として送る。
// 請求者はbackendのcurrent userから決定されるため、frontendからは送らない。
export async function sendBillingRequests({
  requests,
}: SendBillingRequestsParams): Promise<void> {
  const response = await fetch(PAYMENT_REQUESTS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: requests.map(({ recipientId, amount }) => ({
        recipientId,
        amount,
      })),
    }),
  });

  if (!response.ok) {
    throw new Error(`請求に失敗しました（status: ${response.status}）`);
  }
}
