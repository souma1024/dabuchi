import type { TransactionRecord } from '../../domain/transaction.js';

export type TransactionSort = 'created-asc' | 'created-desc';

export interface TransactionCreatedAtCursor {
  createdAt: string;
  id: string;
}

export interface TransactionCursor {
  sort: TransactionSort;
  value: TransactionCreatedAtCursor;
}

export const DEFAULT_TRANSACTION_SORT: TransactionSort = 'created-desc';

export interface FindUserTransactionsInput {
  currentUserId: string;
  cursor: TransactionCursor | null;
  limit: number;
  sort: TransactionSort;
}

export interface TransactionRepository {
  findTransactions: (
    input: FindUserTransactionsInput,
  ) => Promise<TransactionRecord[]>;
}
