import { Router } from 'express';

import type { ListUserRecipients } from '../../application/usecases/listUserRecipients.js';
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

export function createUserRecipientRouter(
  listUserRecipients: ListUserRecipients,
): Router {
  const router = Router();

  router.get('/:currentUserId/recipients', (request, response, next) => {
    void (async () => {
      const { currentUserId } = request.params;
      const cursorValue = request.query.cursor;

      if (!currentUserId || !isUuid(currentUserId)) {
        throw new InvalidRecipientRequestError('currentUserId must be a UUID.');
      }

      if (cursorValue !== undefined && typeof cursorValue !== 'string') {
        throw new InvalidRecipientRequestError('cursor must be a string.');
      }

      const cursor = cursorValue ? decodeRecipientCursor(cursorValue) : null;

      if (cursorValue && !cursor) {
        throw new InvalidRecipientRequestError('cursor is invalid.');
      }

      const result = await listUserRecipients.execute({
        currentUserId,
        cursor,
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
