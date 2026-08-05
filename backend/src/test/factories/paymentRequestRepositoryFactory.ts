import { vi } from 'vitest';

import type { PaymentRequestRepository } from '../../domain/paymentRequestRepository.js';

export function createPaymentRequestRepository(): PaymentRequestRepository {
  return {
    saveAll: vi
      .fn<PaymentRequestRepository['saveAll']>()
      .mockImplementation((paymentRequests) =>
        Promise.resolve(
          paymentRequests.map((paymentRequest) => ({
            ...paymentRequest,
            status: 'pending' as const,
          })),
        ),
      ),
  };
}
