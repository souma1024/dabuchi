import { Router } from 'express';

import type { ListUserRecipients } from '../../application/usecases/listUserRecipients.js';
import type { RecipientSort } from '../../application/ports/userRecipientRepository.js';
import {
  decodeRecipientCursor,
  encodeRecipientCursor,
  isUuid,
} from './recipientCursorCodec.js';

export class InvalidRecipientRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRecipientRequestError';
  }
}

function parseRecipientSort(value: unknown): RecipientSort {
  if (value === undefined) {
    return 'created-asc';
  }

  if (typeof value !== 'string') {
    throw new InvalidRecipientRequestError('sort must be a string.');
  }

  if (
    value !== 'created-asc' &&
    value !== 'created-desc' &&
    value !== 'name-asc'
  ) {
    throw new InvalidRecipientRequestError(
      'sort must be one of created-asc, created-desc or name-asc.',
    );
  }

  return value;
}

export function createUserRecipientRouter(
  listUserRecipients: ListUserRecipients,
): Router {
  const router = Router();

  router.get('/:currentUserId/recipients', (request, response, next) => {
    void (async () => {
      const { currentUserId } = request.params;
      const cursorValue = request.query.cursor;
      const sort = parseRecipientSort(request.query.sort);

      if (!currentUserId || !isUuid(currentUserId)) {
        throw new InvalidRecipientRequestError('currentUserId must be a UUID.');
      }

      if (cursorValue !== undefined && typeof cursorValue !== 'string') {
        throw new InvalidRecipientRequestError('cursor must be a string.');
      }

      const cursor = cursorValue ? decodeRecipientCursor(cursorValue) : null;

      if (cursorValue && (!cursor || cursor.sort !== sort)) {
        throw new InvalidRecipientRequestError('cursor is invalid.');
      }

      const result = await listUserRecipients.execute({
        currentUserId,
        cursor,
        sort,
      });

      response.status(200).json({
        users: result.users,
        pageInfo: {
          nextCursor: result.nextCursor
            ? encodeRecipientCursor(result.nextCursor)
            : null,
          hasNextPage: result.nextCursor !== null,
        },
      });
    })().catch(next);
  });

  return router;
}
