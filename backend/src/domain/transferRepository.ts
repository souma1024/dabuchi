export interface NewTransfer {
  userId: string;
  amount: number;
}

export interface SavedTransfer extends NewTransfer {
  id: number;
}

export interface TransferRepository {
  save(transfer: NewTransfer): Promise<SavedTransfer>;
}
