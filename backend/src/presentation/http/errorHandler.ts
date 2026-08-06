import type { ErrorRequestHandler } from 'express';

import {
  InvalidPaymentRequestError,
  PaymentRequestParticipantNotFoundError,
} from '../../application/createPaymentRequests.js';
import {
  IdempotencyKeyConflictError,
  InsufficientBalanceError,
  InvalidTransferError,
  TransferParticipantNotFoundError,
} from '../../application/createTransfer.js';
import { CurrentUserNotFoundError } from '../../application/errors/currentUserNotFoundError.js';
import { InvalidRecipientRequestError } from './userRecipientRouter.js';
import { InvalidTransactionRequestError } from './userTransactionRouter.js';

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

  if (error instanceof InvalidTransactionRequestError) {
    response.status(400).json({
      error: { code: 'INVALID_REQUEST', message: error.message },
    });
    return;
  }

  if (error instanceof InvalidTransferError) {
    response.status(400).json({
      error: { code: 'INVALID_REQUEST', message: error.message },
    });
    return;
  }

  if (error instanceof InvalidPaymentRequestError) {
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

  if (error instanceof TransferParticipantNotFoundError) {
    response.status(422).json({
      error: {
        code: 'TRANSFER_PARTICIPANT_NOT_FOUND',
        message: error.message,
      },
    });
    return;
  }

  if (error instanceof InsufficientBalanceError) {
    response.status(422).json({
      error: {
        code: 'INSUFFICIENT_BALANCE',
        message: error.message,
      },
    });
    return;
  }

  if (error instanceof IdempotencyKeyConflictError) {
    response.status(409).json({
      error: {
        code: 'IDEMPOTENCY_KEY_CONFLICT',
        message: error.message,
      },
    });
    return;
  }

  if (error instanceof PaymentRequestParticipantNotFoundError) {
    response.status(422).json({
      error: {
        code: 'PAYMENT_REQUEST_PARTICIPANT_NOT_FOUND',
        message: error.message,
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
