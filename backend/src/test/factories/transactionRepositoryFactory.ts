import { vi } from 'vitest';

import type {
  TransactionRepository,
  TransactionSort,
} from '../../application/ports/transactionRepository.js';
import type { TransactionRecord } from '../../domain/transaction.js';

interface RepositoryFactoryOptions {
  currentUserExists?: boolean;
  sorter?: (
    sort: TransactionSort,
    transactions: TransactionRecord[],
  ) => TransactionRecord[];
  transactions?: TransactionRecord[];
}

export function createTransactionRepository(
  options: RepositoryFactoryOptions = {},
): TransactionRepository {
  return {
    existsById: vi
      .fn<TransactionRepository['existsById']>()
      .mockResolvedValue(options.currentUserExists ?? true),
    findTransactions: vi
      .fn<TransactionRepository['findTransactions']>()
      .mockImplementation((input) =>
        Promise.resolve(
          options.sorter
            ? options.sorter(input.sort, options.transactions ?? [])
            : (options.transactions ?? []),
        ),
      ),
  };
}
