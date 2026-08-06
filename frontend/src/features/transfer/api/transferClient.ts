export interface SendTransferParams {
  senderId: string;
  recipientId: string;
  amount: number;
  // 送金1件を一意に識別する冪等キー。再送しても二重送金にならないようサーバへ渡す。
  idempotencyKey: string;
}

const TRANSFER_ENDPOINT = '/api/transfers';

export async function sendTransfer({
  senderId,
  recipientId,
  amount,
  idempotencyKey,
}: SendTransferParams): Promise<void> {
  const response = await fetch(TRANSFER_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({ senderId, recipientId, amount }),
  });

  if (!response.ok) {
    throw new Error(`送金に失敗しました（status: ${response.status}）`);
  }
}
