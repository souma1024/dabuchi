import type { ErrorRequestHandler } from 'express';

import { CurrentUserNotFoundError } from '../../application/errors/currentUserNotFoundError.js';
import { InvalidRecipientRequestError } from './userRecipientRouter.js';

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  next,
) => {
  void next;

  if (error instanceof InvalidRecipientRequestError) {
    response.status(400).json({
      error: { code: 'INVALID_REQUEST', message: error.message },
    });
    return;
  }

  if (error instanceof CurrentUserNotFoundError) {
    response.status(404).json({
      error: {
        code: 'CURRENT_USER_NOT_FOUND',
        message: 'Current user was not found.',
      },
    });
    return;
  }

  console.error('Unexpected error while handling a request.', error);
  response.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
    },
  });
};
