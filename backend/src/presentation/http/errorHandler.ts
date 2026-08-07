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
import {
  InvalidCredentialsError,
  InvalidSignUpError,
  NotAuthenticatedError,
  UserIdAlreadyTakenError,
} from '../../application/errors/authErrors.js';
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
import {
  InvalidPaymentRequestIdError,
  PaymentRequestAlreadyRespondedError,
  PaymentRequestForbiddenError,
  PaymentRequestNotFoundError,
} from '../../application/errors/paymentRequestCommandErrors.js';
import { InvalidFriendshipError } from '../../domain/friendship.js';
import { InvalidPasswordError } from '../../domain/password.js';
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

  if (error instanceof InvalidPaymentRequestIdError) {
    response.status(400).json({
      error: { code: 'INVALID_REQUEST', message: error.message },
    });
    return;
  }

  if (error instanceof PaymentRequestNotFoundError) {
    response.status(404).json({
      error: { code: 'PAYMENT_REQUEST_NOT_FOUND', message: error.message },
    });
    return;
  }

  // 請求者や第三者による承認・拒否。存在しない場合の404とは区別する。
  if (error instanceof PaymentRequestForbiddenError) {
    response.status(403).json({
      error: { code: 'PAYMENT_REQUEST_FORBIDDEN', message: error.message },
    });
    return;
  }

  // すでに承認・拒否済み。二重実行を止めるのはserver側の責務。
  if (error instanceof PaymentRequestAlreadyRespondedError) {
    response.status(409).json({
      error: {
        code: 'PAYMENT_REQUEST_ALREADY_RESPONDED',
        message: error.message,
      },
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

  if (
    error instanceof InvalidSignUpError ||
    error instanceof InvalidPasswordError
  ) {
    response.status(400).json({
      error: { code: 'INVALID_REQUEST', message: error.message },
    });
    return;
  }

  // 認証の失敗はどちらが違うかを伝えない。存在するuser_idを探らせないため。
  if (error instanceof InvalidCredentialsError) {
    response.status(401).json({
      error: { code: 'INVALID_CREDENTIALS', message: error.message },
    });
    return;
  }

  if (error instanceof NotAuthenticatedError) {
    response.status(401).json({
      error: { code: 'NOT_AUTHENTICATED', message: error.message },
    });
    return;
  }

  if (error instanceof UserIdAlreadyTakenError) {
    response.status(409).json({
      error: { code: 'USER_ID_ALREADY_TAKEN', message: error.message },
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
