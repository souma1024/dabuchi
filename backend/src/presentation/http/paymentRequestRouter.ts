import { Router } from 'express';

import type { CreatePaymentRequests } from '../../application/createPaymentRequests.js';
import type { PaymentRequestCursor } from '../../application/ports/paymentRequestListRepository.js';
import type { ListPaymentRequests } from '../../application/usecases/listPaymentRequests.js';
import type {
  PaymentRequestDirection,
  PaymentRequestState,
} from '../../domain/paymentRequest.js';
import {
  decodePaymentRequestCursor,
  encodePaymentRequestCursor,
} from './paymentRequestCursorCodec.js';

export class InvalidPaymentRequestQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPaymentRequestQueryError';
  }
}

const DIRECTIONS: readonly string[] = ['received', 'sent'];
const STATES: readonly string[] = ['pending', 'accepted', 'rejected'];

function parseDirection(value: unknown): PaymentRequestDirection {
  if (typeof value !== 'string' || !DIRECTIONS.includes(value)) {
    throw new InvalidPaymentRequestQueryError(
      'direction must be "received" or "sent"',
    );
  }

  return value as PaymentRequestDirection;
}

function parseStatus(value: unknown): PaymentRequestState | null {
  if (value === undefined) {
    return null;
  }

  if (typeof value !== 'string' || !STATES.includes(value)) {
    throw new InvalidPaymentRequestQueryError(
      'status must be "pending", "accepted" or "rejected"',
    );
  }

  return value as PaymentRequestState;
}

function parseCursor(value: unknown): PaymentRequestCursor | null {
  if (value === undefined) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new InvalidPaymentRequestQueryError('cursor must be a string');
  }

  const cursor = decodePaymentRequestCursor(value);

  if (cursor === null) {
    throw new InvalidPaymentRequestQueryError('cursor is invalid');
  }

  return cursor;
}

export function createPaymentRequestRouter(
  createPaymentRequests: CreatePaymentRequests,
  currentUserId: string,
  listPaymentRequests: ListPaymentRequests,
) {
  const router = Router();

  router.get('/', async (request, response, next) => {
    try {
      const result = await listPaymentRequests.execute({
        currentUserId,
        direction: parseDirection(request.query.direction),
        status: parseStatus(request.query.status),
        cursor: parseCursor(request.query.cursor),
      });

      response.status(200).json({
        requests: result.requests,
        pageInfo: {
          nextCursor:
            result.nextCursor === null
              ? null
              : encodePaymentRequestCursor(result.nextCursor),
          hasNextPage: result.nextCursor !== null,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/', async (request, response, next) => {
    try {
      const paymentRequests = await createPaymentRequests.execute(
        currentUserId,
        request.body,
      );
      response.status(201).json({ requests: paymentRequests });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
