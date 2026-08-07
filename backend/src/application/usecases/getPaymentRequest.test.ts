import { describe, expect, it } from 'vitest';

import { createCurrentUser } from '../../test/factories/currentUserFactory.js';
import { createCurrentUserRepository } from '../../test/factories/currentUserRepositoryFactory.js';
import {
  createPaymentRequestQueryRepository,
  createPaymentRequestRecord,
} from '../../test/factories/paymentRequestQueryFactory.js';
import { CurrentUserNotFoundError } from '../errors/currentUserNotFoundError.js';
import {
  InvalidPaymentRequestIdError,
  PaymentRequestNotFoundError,
} from '../errors/paymentRequestErrors.js';
import type { PaymentRequestQueryRepository } from '../ports/paymentRequestQueryRepository.js';
import { GetPaymentRequest } from './getPaymentRequest.js';

// 受け取るのは公開user_id。内部UUIDへ解決してからpayment_requestsを引く。
const CURRENT_USER_PUBLIC_ID = 'friend-001';
const CURRENT_USER_INTERNAL_ID = '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001';
const PAYMENT_REQUEST_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function createUsecase(repository: PaymentRequestQueryRepository) {
  return new GetPaymentRequest(
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
    ...overrides,
  };
}

describe('GetPaymentRequest', () => {
  it('公開user_idを内部UUIDへ解決してからrepositoryへ渡す', async () => {
    const repository = createPaymentRequestQueryRepository({
      record: createPaymentRequestRecord(1),
    });

    await createUsecase(repository).execute(createInput());

    expect(repository.findPaymentRequestById).toHaveBeenCalledWith({
      paymentRequestId: PAYMENT_REQUEST_ID,
      currentUserInternalId: CURRENT_USER_INTERNAL_ID,
    });
  });

  it('相手をネストし、日時をISO 8601へ変換して返す', async () => {
    const record = createPaymentRequestRecord(1, {
      amount: 3000,
      status: 'accepted',
      endedByMe: null,
      createdAt: '2026-08-03 01:00:00.000000',
      respondedAt: '2026-08-04 02:30:00.500000',
    });

    const result = await createUsecase(
      createPaymentRequestQueryRepository({ record }),
    ).execute(createInput());

    expect(result).toEqual({
      id: record.id,
      counterparty: {
        id: record.counterpartyId,
        name: record.counterpartyName,
        profileUrl: record.counterpartyProfileUrl,
      },
      amount: 3000,
      status: 'accepted',
      endedByMe: null,
      createdAt: '2026-08-03T01:00:00.000Z',
      respondedAt: '2026-08-04T02:30:00.500Z',
    });
  });

  it('未応答の請求はrespondedAtをnullのまま返す', async () => {
    const result = await createUsecase(
      createPaymentRequestQueryRepository({
        record: createPaymentRequestRecord(1, { respondedAt: null }),
      }),
    ).execute(createInput());

    expect(result.respondedAt).toBeNull();
  });

  // 当事者でない場合もrepositoryはnullを返す。存在の有無を区別しない。
  it('repositoryがnullを返したら404用errorにする', async () => {
    const repository = createPaymentRequestQueryRepository({ record: null });

    await expect(
      createUsecase(repository).execute(createInput()),
    ).rejects.toBeInstanceOf(PaymentRequestNotFoundError);
  });

  it.each([
    ['UUIDでない', 'not-a-uuid'],
    ['空文字', ''],
    ['連番', '20'],
  ])(
    '請求IDが%sならrepositoryを呼ばずに弾く',
    async (_name, paymentRequestId) => {
      const repository = createPaymentRequestQueryRepository({
        record: createPaymentRequestRecord(1),
      });

      await expect(
        createUsecase(repository).execute(createInput({ paymentRequestId })),
      ).rejects.toBeInstanceOf(InvalidPaymentRequestIdError);
      expect(repository.findPaymentRequestById).not.toHaveBeenCalled();
    },
  );

  it('現在ユーザーが存在しなければrepositoryを呼ばずにエラーにする', async () => {
    const repository = createPaymentRequestQueryRepository({
      record: createPaymentRequestRecord(1),
    });
    const usecase = new GetPaymentRequest(
      createCurrentUserRepository({ user: null }),
      repository,
    );

    await expect(usecase.execute(createInput())).rejects.toBeInstanceOf(
      CurrentUserNotFoundError,
    );
    expect(repository.findPaymentRequestById).not.toHaveBeenCalled();
  });
});
