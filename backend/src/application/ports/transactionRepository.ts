import type { TransactionRecord } from '../../domain/transaction.js';

export type TransactionSort = 'created-desc' | 'created-asc';

export interface TransactionCursor {
  sort: TransactionSort;
  value: {
    createdAt: string;
    id: string;
  };
}

export const DEFAULT_TRANSACTION_SORT: TransactionSort = 'created-desc';

export interface FindUserTransactionsInput {
  currentUserId: string;
  cursor: TransactionCursor | null;
  limit: number;
  sort: TransactionSort;
}

export interface TransactionRepository {
  existsById: (id: string) => Promise<boolean>;
  findTransactions: (
    input: FindUserTransactionsInput,
  ) => Promise<TransactionRecord[]>;
}
