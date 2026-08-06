import { vi } from 'vitest';

import type { TransactionRepository } from '../../application/ports/transactionRepository.js';
import type { TransactionRecord } from '../../domain/transaction.js';

interface RepositoryFactoryOptions {
  transactions?: TransactionRecord[];
}

export function createTransactionRepository(
  options: RepositoryFactoryOptions = {},
): TransactionRepository {
  return {
    findTransactions: vi
      .fn<TransactionRepository['findTransactions']>()
      .mockResolvedValue(options.transactions ?? []),
  };
}
