import type { TransactionRecord } from '../../domain/transaction.js';

export function createTransactionRecord(
  sequence = 1,
  overrides: Partial<TransactionRecord> = {},
): TransactionRecord {
  const suffix = String(sequence).padStart(12, '0');
  const seconds = String(sequence % 60).padStart(2, '0');

  return {
    id: String(sequence),
    counterpartyId: `00000000-0000-4000-8000-${suffix}`,
    counterpartyName: `テストユーザー${sequence}`,
    counterpartyProfileUrl: `/assets/profiles/human${((sequence - 1) % 6) + 1}.png`,
    amount: sequence * 100,
    direction: sequence % 2 === 0 ? 'received' : 'sent',
    createdAt: `2026-08-04 12:00:${seconds}.000000`,
    ...overrides,
  };
}

export function createTransactionRecords(count: number): TransactionRecord[] {
  return Array.from({ length: count }, (_, index) =>
    createTransactionRecord(index + 1),
  );
}
