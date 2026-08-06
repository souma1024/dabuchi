import { vi } from 'vitest';

import type { TransactionRepository } from '../../application/ports/transactionRepository.js';
import type { TransactionRecord } from '../../domain/transaction.js';

interface RepositoryFactoryOptions {
  currentUserExists?: boolean;
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
      .mockResolvedValue(options.transactions ?? []),
  };
}
