import { Router } from 'express';

import type { ListUserTransactions } from '../../application/usecases/listUserTransactions.js';
import { DEFAULT_TRANSACTION_SORT } from '../../application/ports/transactionRepository.js';
import {
  decodeTransactionCursor,
  encodeTransactionCursor,
  isTransactionSort,
} from './transactionCursorCodec.js';

export class InvalidTransactionRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTransactionRequestError';
  }
}

export function createUserTransactionRouter(
  listUserTransactions: ListUserTransactions,
  currentUserId: string,
): Router {
  const router = Router();

  router.get('/', (request, response, next) => {
    void (async () => {
      const cursorValue = request.query.cursor;
      const sortValue = request.query.sort;

      if (cursorValue !== undefined && typeof cursorValue !== 'string') {
        throw new InvalidTransactionRequestError('cursor must be a string.');
      }
      if (sortValue !== undefined && typeof sortValue !== 'string') {
        throw new InvalidTransactionRequestError('sort must be a string.');
      }
      if (sortValue !== undefined && !isTransactionSort(sortValue)) {
        throw new InvalidTransactionRequestError(
          'sort must be one of created-asc or created-desc.',
        );
      }

      const cursor = cursorValue ? decodeTransactionCursor(cursorValue) : null;
      const sort = sortValue ?? DEFAULT_TRANSACTION_SORT;

      if (cursorValue && (!cursor || cursor.sort !== sort)) {
        throw new InvalidTransactionRequestError('cursor is invalid.');
      }

      const result = await listUserTransactions.execute(
        currentUserId,
        cursor,
        sort,
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
