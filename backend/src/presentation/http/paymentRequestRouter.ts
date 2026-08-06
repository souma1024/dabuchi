import { Router, type RequestHandler } from 'express';

import type { CreatePaymentRequests } from '../../application/createPaymentRequests.js';
import type { PaymentRequestCursor } from '../../application/ports/paymentRequestListRepository.js';
import type { ListPaymentRequests } from '../../application/usecases/listPaymentRequests.js';
import type { RespondToPaymentRequest } from '../../application/usecases/respondToPaymentRequest.js';
import type {
  PaymentRequestDirection,
  PaymentRequestResponse,
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

interface PaymentRequestRouterDependencies {
  createPaymentRequests: CreatePaymentRequests;
  /** mock認証で決まる現在ユーザーの公開user_id。内部UUIDはusecase側で解決する。 */
  currentUserPublicId: string;
  listPaymentRequests: ListPaymentRequests;
  respondToPaymentRequest: RespondToPaymentRequest;
}

export function createPaymentRequestRouter({
  createPaymentRequests,
  currentUserPublicId,
  listPaymentRequests,
  respondToPaymentRequest,
}: PaymentRequestRouterDependencies) {
  const router = Router();

  // 承認と拒否は同じ手続きで、残高が動くかどうかだけが違う。
  // 経路を分けるのは、URLに動詞を出して意図を明示するため。
  const respond =
    (response: PaymentRequestResponse): RequestHandler =>
    async (request, httpResponse, next) => {
      try {
        const result = await respondToPaymentRequest.execute({
          currentUserId: currentUserPublicId,
          // 単一のpath parameterだが、型上は配列もありうる。
          // 配列なら空文字にしてusecase側のUUID検証で400にする。
          paymentRequestId:
            typeof request.params.id === 'string' ? request.params.id : '',
          response,
        });

        // 残高は承認時のみ返す。拒否では動かないため項目ごと省く。
        httpResponse
          .status(200)
          .json(
            result.balance === null
              ? { request: result.request }
              : { request: result.request, balance: result.balance },
          );
      } catch (error) {
        next(error);
      }
    };

  router.post('/:id/accept', respond('accepted'));
  router.post('/:id/reject', respond('rejected'));

  router.get('/', async (request, response, next) => {
    try {
      const result = await listPaymentRequests.execute({
        currentUserId: currentUserPublicId,
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
        currentUserPublicId,
        request.body,
      );
      response.status(201).json({ requests: paymentRequests });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
