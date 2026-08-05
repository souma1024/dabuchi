export interface SendBillingRequestParams {
  recipientId: string;
  amount: number;
}

const PAYMENT_REQUESTS_ENDPOINT = '/api/payment-requests';

// backendは複数の被請求者への一括請求を受け付ける。請求画面は1件ずつ送るため、要素1件の配列で送信する。
// 請求者はbackendのcurrent userから決定されるため、frontendからは送らない。
export async function sendBillingRequest({
  recipientId,
  amount,
}: SendBillingRequestParams): Promise<void> {
  const response = await fetch(PAYMENT_REQUESTS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [{ recipientId, amount }] }),
  });

  if (!response.ok) {
    throw new Error(`請求に失敗しました（status: ${response.status}）`);
  }
}
