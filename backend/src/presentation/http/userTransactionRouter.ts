import { Router } from 'express';

import type { ListUserTransactions } from '../../application/usecases/listUserTransactions.js';
import { requireCurrentUser } from './authentication.js';
import {
  decodeTransactionCursor,
  encodeTransactionCursor,
} from './transactionCursorCodec.js';

export class InvalidTransactionRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTransactionRequestError';
  }
}

export function createUserTransactionRouter(
  listUserTransactions: ListUserTransactions,
): Router {
  const router = Router();

  router.get('/', (request, response, next) => {
    void (async () => {
      const cursorValue = request.query.cursor;

      if (cursorValue !== undefined && typeof cursorValue !== 'string') {
        throw new InvalidTransactionRequestError('cursor must be a string.');
      }

      const cursor = cursorValue ? decodeTransactionCursor(cursorValue) : null;

      if (cursorValue && !cursor) {
        throw new InvalidTransactionRequestError('cursor is invalid.');
      }

      // 現在ユーザーはセッションから決まる。clientからは指定できない。
      const result = await listUserTransactions.execute(
        requireCurrentUser(response).userId,
        cursor,
      );

      response.status(200).json({
        transactions: result.transactions,
        pageInfo: {
          nextCursor: result.nextCursor
            ? encodeTransactionCursor(result.nextCursor)
            : null,
          hasNextPage: result.nextCursor !== null,
        },
      });
    })().catch(next);
  });

  return router;
}
