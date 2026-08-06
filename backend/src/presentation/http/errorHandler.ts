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
import {
  FriendUserNotFoundError,
  FriendshipAlreadyExistsError,
  FriendshipNoteAlreadyExistsError,
  FriendshipNoteNotFoundError,
  FriendshipNotFoundError,
  InvalidFriendshipIdError,
  InvalidFriendUserIdError,
} from '../../application/errors/friendCommandErrors.js';
import { InvalidFriendshipError } from '../../domain/friendship.js';
import { InvalidFriendshipNoteError } from '../../domain/friendshipNote.js';
import { InvalidUserBlockError } from '../../domain/userBlock.js';
import { InvalidFriendRequestError } from './friendQueryRouter.js';
import { InvalidPaymentRequestQueryError } from './paymentRequestRouter.js';
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

  if (error instanceof InvalidPaymentRequestQueryError) {
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

  if (
    error instanceof InvalidFriendRequestError ||
    error instanceof InvalidFriendUserIdError ||
    error instanceof InvalidFriendshipIdError ||
    error instanceof InvalidFriendshipError ||
    error instanceof InvalidFriendshipNoteError ||
    error instanceof InvalidUserBlockError
  ) {
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

  // 相手からブロックされている友達関係も、存在しない場合と区別せず404にする。
  if (error instanceof FriendshipNotFoundError) {
    response.status(404).json({
      error: { code: 'FRIENDSHIP_NOT_FOUND', message: error.message },
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

  if (error instanceof FriendUserNotFoundError) {
    response.status(404).json({
      error: { code: 'FRIEND_USER_NOT_FOUND', message: error.message },
    });
    return;
  }

  if (error instanceof FriendshipNoteNotFoundError) {
    response.status(404).json({
      error: { code: 'FRIENDSHIP_NOTE_NOT_FOUND', message: error.message },
    });
    return;
  }

  if (error instanceof FriendshipAlreadyExistsError) {
    response.status(409).json({
      error: { code: 'FRIENDSHIP_ALREADY_EXISTS', message: error.message },
    });
    return;
  }

  if (error instanceof FriendshipNoteAlreadyExistsError) {
    response.status(409).json({
      error: {
        code: 'FRIENDSHIP_NOTE_ALREADY_EXISTS',
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
