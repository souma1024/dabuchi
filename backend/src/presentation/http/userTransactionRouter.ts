import { Router } from 'express';

import type { TransactionSort } from '../../application/ports/transactionRepository.js';
import type { ListUserTransactions } from '../../application/usecases/listUserTransactions.js';
import {
  decodeTransactionCursor,
  encodeTransactionCursor,
} from './transactionCursorCodec.js';
import { isUuid } from './recipientCursorCodec.js';

export class InvalidTransactionRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTransactionRequestError';
  }
}

function parseTransactionSort(value: unknown): TransactionSort {
  if (value === undefined) {
    return 'created-desc';
  }

  if (typeof value !== 'string') {
    throw new InvalidTransactionRequestError('sort must be a string.');
  }

  if (value !== 'created-desc' && value !== 'created-asc') {
    throw new InvalidTransactionRequestError(
      'sort must be one of created-desc or created-asc.',
    );
  }

  return value;
}

export function createUserTransactionRouter(
  listUserTransactions: ListUserTransactions,
): Router {
  const router = Router();

  router.get('/:currentUserId/transactions', (request, response, next) => {
    void (async () => {
      const { currentUserId } = request.params;
      const cursorValue = request.query.cursor;
      const sort = parseTransactionSort(request.query.sort);

      if (!currentUserId || !isUuid(currentUserId)) {
        throw new InvalidTransactionRequestError(
          'currentUserId must be a UUID.',
        );
      }

      if (cursorValue !== undefined && typeof cursorValue !== 'string') {
        throw new InvalidTransactionRequestError('cursor must be a string.');
      }

      const cursor = cursorValue ? decodeTransactionCursor(cursorValue) : null;

      if (cursorValue && (!cursor || cursor.sort !== sort)) {
        throw new InvalidTransactionRequestError('cursor is invalid.');
      }

      const result = await listUserTransactions.execute({
        currentUserId,
        cursor,
        sort,
      });

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
