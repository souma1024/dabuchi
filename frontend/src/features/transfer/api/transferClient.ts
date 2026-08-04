export interface SendTransferParams {
  userId: string;
  amount: number;
}

// TODO: backend担当とエンドポイント・HTTPメソッドを確定次第、このパスを更新する（現時点は仮）。
const TRANSFER_ENDPOINT = '/api/transfers';

export async function sendTransfer({
  userId,
  amount,
}: SendTransferParams): Promise<void> {
  const response = await fetch(TRANSFER_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, amount }),
  });

  if (!response.ok) {
    throw new Error(`送金に失敗しました（status: ${response.status}）`);
  }
}
