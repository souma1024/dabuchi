import { vi } from 'vitest';

import type { PaymentRequestListRepository } from '../../application/ports/paymentRequestListRepository.js';
import type { PaymentRequestRecord } from '../../domain/paymentRequest.js';

export function createPaymentRequestRecord(
  sequence = 1,
  overrides: Partial<PaymentRequestRecord> = {},
): PaymentRequestRecord {
  const suffix = String(sequence).padStart(12, '0');
  const seconds = String(sequence % 60).padStart(2, '0');

  return {
    id: `00000000-0000-4000-8000-${suffix}`,
    counterpartyId: `11111111-1111-4111-8111-${suffix}`,
    counterpartyName: `テストユーザー${sequence}`,
    counterpartyProfileUrl: `/assets/profiles/human${((sequence - 1) % 6) + 1}.png`,
    amount: sequence * 100,
    status: 'pending',
    createdAt: `2026-08-04 12:00:${seconds}.000000`,
    respondedAt: null,
    ...overrides,
  };
}

export function createPaymentRequestRecords(
  count: number,
): PaymentRequestRecord[] {
  return Array.from({ length: count }, (_, index) =>
    createPaymentRequestRecord(index + 1),
  );
}

interface ListRepositoryOptions {
  records?: PaymentRequestRecord[];
  /** findPaymentRequestById が返す1件。未指定なら records の先頭。 */
  record?: PaymentRequestRecord | null;
}

export function createPaymentRequestListRepository(
  options: ListRepositoryOptions = {},
): PaymentRequestListRepository {
  const records = options.records ?? [];

  return {
    findPaymentRequests: vi
      .fn<PaymentRequestListRepository['findPaymentRequests']>()
      .mockResolvedValue(records),
    findPaymentRequestById: vi
      .fn<PaymentRequestListRepository['findPaymentRequestById']>()
      .mockResolvedValue(
        options.record !== undefined ? options.record : (records[0] ?? null),
      ),
  };
}
