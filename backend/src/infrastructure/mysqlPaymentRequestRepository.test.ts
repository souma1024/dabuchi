import { describe, expect, it } from 'vitest';

import { PaymentRequestParticipantNotFoundError } from '../application/createPaymentRequests.js';
import type { NewPaymentRequest } from '../domain/paymentRequestRepository.js';
import { createMysqlPool } from '../test/factories/mysqlPoolFactory.js';
import { MysqlPaymentRequestRepository } from './mysqlPaymentRequestRepository.js';

const paymentRequests: NewPaymentRequest[] = [
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    requesterId: '11111111-1111-4111-8111-111111111111',
    recipientId: '22222222-2222-4222-8222-222222222222',
    amount: 1_500,
  },
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    requesterId: '11111111-1111-4111-8111-111111111111',
    recipientId: '33333333-3333-4333-8333-333333333333',
    amount: 2_800,
  },
];

describe('MysqlPaymentRequestRepository', () => {
  it('複数人分を一つのprepared INSERTで保存する', async () => {
    const { pool, execute } = createMysqlPool([{ affectedRows: 2 }]);
    const repository = new MysqlPaymentRequestRepository(pool);

    await expect(repository.saveAll(paymentRequests)).resolves.toEqual(
      paymentRequests.map((paymentRequest) => ({
        ...paymentRequest,
        status: 'pending',
      })),
    );
    expect(execute).toHaveBeenCalledWith(
      `INSERT INTO payment_requests
           (id, requester_id, recipient_id, amount, status)
         VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), UUID_TO_BIN(?), ?, 'pending'), (UUID_TO_BIN(?), UUID_TO_BIN(?), UUID_TO_BIN(?), ?, 'pending')`,
      [
        paymentRequests[0]?.id,
        paymentRequests[0]?.requesterId,
        paymentRequests[0]?.recipientId,
        paymentRequests[0]?.amount,
        paymentRequests[1]?.id,
        paymentRequests[1]?.requesterId,
        paymentRequests[1]?.recipientId,
        paymentRequests[1]?.amount,
      ],
    );
  });

  it('外部キー違反をapplication errorへ変換する', async () => {
    const error = new Error('foreign key violation') as Error & {
      code: string;
    };
    error.code = 'ER_NO_REFERENCED_ROW_2';
    const { pool } = createMysqlPool([error]);
    const repository = new MysqlPaymentRequestRepository(pool);

    await expect(repository.saveAll(paymentRequests)).rejects.toBeInstanceOf(
      PaymentRequestParticipantNotFoundError,
    );
  });
});
