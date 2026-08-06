import type { TransactionRecord } from '../../domain/transaction.js';

export interface TransactionCursor {
  createdAt: string;
  id: string;
}

export interface FindUserTransactionsInput {
  currentUserId: string;
  cursor: TransactionCursor | null;
  limit: number;
}

export interface TransactionRepository {
  findTransactions: (
    input: FindUserTransactionsInput,
  ) => Promise<TransactionRecord[]>;
}
