export interface NewTransfer {
  senderId: string;
  recipientId: string;
  amount: number;
}

export interface SavedTransfer extends NewTransfer {
  id: number;
}

export interface TransferRepository {
  save(transfer: NewTransfer): Promise<SavedTransfer>;
}
