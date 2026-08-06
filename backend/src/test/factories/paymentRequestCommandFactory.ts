import { vi } from 'vitest';

import type {
  PaymentRequestCommandRepository,
  RespondedPaymentRequest,
} from '../../application/ports/paymentRequestCommandRepository.js';

export function createRespondedPaymentRequest(
  overrides: Partial<RespondedPaymentRequest> = {},
): RespondedPaymentRequest {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    amount: 3000,
    status: 'accepted',
    respondedAt: '2026-08-06 02:00:00.000000',
    recipientBalance: 117000,
    ...overrides,
  };
}

interface CommandRepositoryOptions {
  responded?: RespondedPaymentRequest;
  /** 指定するとrespondがこのエラーで失敗する。 */
  error?: Error;
}

export function createPaymentRequestCommandRepository(
  options: CommandRepositoryOptions = {},
): PaymentRequestCommandRepository {
  const respond = vi.fn<PaymentRequestCommandRepository['respond']>();

  if (options.error) {
    respond.mockRejectedValue(options.error);
  } else {
    respond.mockResolvedValue(
      options.responded ?? createRespondedPaymentRequest(),
    );
  }

  return { respond };
}
