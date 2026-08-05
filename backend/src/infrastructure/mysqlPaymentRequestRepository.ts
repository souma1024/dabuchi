import type { ResultSetHeader } from 'mysql2';
import type { Pool } from 'mysql2/promise';

import { PaymentRequestParticipantNotFoundError } from '../application/createPaymentRequests.js';
import type {
  NewPaymentRequest,
  PaymentRequestRepository,
  SavedPaymentRequest,
} from '../domain/paymentRequestRepository.js';
import { isForeignKeyViolation } from './database/mysqlError.js';

export class MysqlPaymentRequestRepository implements PaymentRequestRepository {
  constructor(private readonly pool: Pool) {}

  async saveAll(
    paymentRequests: readonly NewPaymentRequest[],
  ): Promise<SavedPaymentRequest[]> {
    const values = paymentRequests
      .map(
        () => `(UUID_TO_BIN(?), UUID_TO_BIN(?), UUID_TO_BIN(?), ?, 'pending')`,
      )
      .join(', ');
    const parameters = paymentRequests.flatMap((paymentRequest) => [
      paymentRequest.id,
      paymentRequest.requesterId,
      paymentRequest.recipientId,
      paymentRequest.amount,
    ]);

    try {
      await this.pool.execute<ResultSetHeader>(
        `INSERT INTO payment_requests
           (id, requester_id, recipient_id, amount, status)
         VALUES ${values}`,
        parameters,
      );
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new PaymentRequestParticipantNotFoundError();
      }

      throw error;
    }

    return paymentRequests.map((paymentRequest) => ({
      ...paymentRequest,
      status: 'pending',
    }));
  }
}
