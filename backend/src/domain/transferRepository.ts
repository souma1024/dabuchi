export interface NewTransfer {
  senderId: string;
  recipientId: string;
  amount: number;
  // 冪等性キー。同一キーの送金は一度だけ実行される。未指定なら重複排除を行わない。
  idempotencyKey?: string;
}

export interface SavedTransfer {
  id: number;
  senderId: string;
  recipientId: string;
  amount: number;
}

export interface TransferRepository {
  save(transfer: NewTransfer): Promise<SavedTransfer>;
}
