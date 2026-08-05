export interface SendTransferParams {
  senderId: string;
  recipientId: string;
  amount: number;
}

const TRANSFER_ENDPOINT = '/api/transfers';

export async function sendTransfer({
  senderId,
  recipientId,
  amount,
}: SendTransferParams): Promise<void> {
  const response = await fetch(TRANSFER_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senderId, recipientId, amount }),
  });

  if (!response.ok) {
    throw new Error(`送金に失敗しました（status: ${response.status}）`);
  }
}
