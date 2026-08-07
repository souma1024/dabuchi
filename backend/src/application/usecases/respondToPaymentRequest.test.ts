import { describe, expect, it } from 'vitest';

import { createCurrentUser } from '../../test/factories/currentUserFactory.js';
import { createCurrentUserRepository } from '../../test/factories/currentUserRepositoryFactory.js';
import {
  createPaymentRequestCommandRepository,
  createRespondedPaymentRequest,
} from '../../test/factories/paymentRequestCommandFactory.js';
import { CurrentUserNotFoundError } from '../errors/currentUserNotFoundError.js';
import { InvalidPaymentRequestIdError } from '../errors/paymentRequestCommandErrors.js';
import type { PaymentRequestCommandRepository } from '../ports/paymentRequestCommandRepository.js';
import { RespondToPaymentRequest } from './respondToPaymentRequest.js';

// 受け取るのは公開user_id。内部UUIDへ解決してからpayment_requestsを引く。
const CURRENT_USER_PUBLIC_ID = 'friend-001';
const CURRENT_USER_INTERNAL_ID = '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001';
const PAYMENT_REQUEST_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function createUsecase(repository: PaymentRequestCommandRepository) {
  return new RespondToPaymentRequest(
    createCurrentUserRepository({
      user: createCurrentUser({ id: CURRENT_USER_INTERNAL_ID }),
    }),
    repository,
  );
}

function createInput(overrides = {}) {
  return {
    currentUserId: CURRENT_USER_PUBLIC_ID,
    paymentRequestId: PAYMENT_REQUEST_ID,
    action: 'accept' as const,
    ...overrides,
  };
}

describe('RespondToPaymentRequest', () => {
  it('公開user_idを内部UUIDへ解決してからrepositoryへ渡す', async () => {
    const repository = createPaymentRequestCommandRepository();

    await createUsecase(repository).execute(createInput());

    expect(repository.respond).toHaveBeenCalledWith({
      paymentRequestId: PAYMENT_REQUEST_ID,
      currentUserInternalId: CURRENT_USER_INTERNAL_ID,
      action: 'accept',
    });
  });

  it('承認は確定後の請求と残高を返す', async () => {
    const repository = createPaymentRequestCommandRepository({
      responded: createRespondedPaymentRequest({
        id: PAYMENT_REQUEST_ID,
        amount: 3000,
        status: 'accepted',
        respondedAt: '2026-08-06 02:00:00.000000',
        recipientBalance: 117000,
      }),
    });

    const result = await createUsecase(repository).execute(createInput());

    expect(result).toEqual({
      request: {
        id: PAYMENT_REQUEST_ID,
        amount: 3000,
        status: 'accepted',
        respondedAt: '2026-08-06T02:00:00.000Z',
      },
      balance: 117000,
    });
  });

  it('拒否は残高をnullで返す', async () => {
    const repository = createPaymentRequestCommandRepository({
      responded: createRespondedPaymentRequest({
        status: 'rejected',
        recipientBalance: null,
      }),
    });

    const result = await createUsecase(repository).execute(
      createInput({ action: 'reject' }),
    );

    expect(result.request.status).toBe('rejected');
    expect(result.balance).toBeNull();
  });

  it.each([
    ['UUIDでない', 'not-a-uuid'],
    ['空文字', ''],
    ['連番', '20'],
  ])(
    '請求IDが%sならrepositoryを呼ばずに弾く',
    async (_name, paymentRequestId) => {
      const repository = createPaymentRequestCommandRepository();

      await expect(
        createUsecase(repository).execute(createInput({ paymentRequestId })),
      ).rejects.toBeInstanceOf(InvalidPaymentRequestIdError);
      expect(repository.respond).not.toHaveBeenCalled();
    },
  );

  it('現在ユーザーが存在しなければrepositoryを呼ばずにエラーにする', async () => {
    const repository = createPaymentRequestCommandRepository();
    const usecase = new RespondToPaymentRequest(
      createCurrentUserRepository({ user: null }),
      repository,
    );

    await expect(usecase.execute(createInput())).rejects.toBeInstanceOf(
      CurrentUserNotFoundError,
    );
    expect(repository.respond).not.toHaveBeenCalled();
  });

  it('repositoryのエラーはそのまま伝える', async () => {
    const failure = new Error('boom');
    const repository = createPaymentRequestCommandRepository({
      error: failure,
    });

    await expect(createUsecase(repository).execute(createInput())).rejects.toBe(
      failure,
    );
  });
});
