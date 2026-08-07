import { describe, expect, it, vi } from 'vitest';

import { createCurrentUser } from '../test/factories/currentUserFactory.js';
import { createCurrentUserRepository } from '../test/factories/currentUserRepositoryFactory.js';
import { createPaymentRequestRepository } from '../test/factories/paymentRequestRepositoryFactory.js';
import { CurrentUserNotFoundError } from './errors/currentUserNotFoundError.js';
import {
  CreatePaymentRequests,
  InvalidPaymentRequestError,
} from './createPaymentRequests.js';

const CURRENT_USER_PUBLIC_ID = 'friend-001';
const CURRENT_USER_INTERNAL_ID = '11111111-1111-4111-8111-111111111111';
const RECIPIENT_ONE_ID = '22222222-2222-4222-8222-222222222222';
const RECIPIENT_TWO_ID = '33333333-3333-4333-8333-333333333333';

function createUseCase(options: { currentUserExists?: boolean } = {}) {
  const currentUserRepository = createCurrentUserRepository({
    user:
      options.currentUserExists === false
        ? null
        : createCurrentUser({ id: CURRENT_USER_INTERNAL_ID }),
  });
  const paymentRequestRepository = createPaymentRequestRepository();
  const ids = [
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  ];
  const generateId = vi.fn(() => ids.shift() ?? 'fallback-id');
  const useCase = new CreatePaymentRequests(
    currentUserRepository,
    paymentRequestRepository,
    generateId,
  );

  return {
    currentUserRepository,
    generateId,
    paymentRequestRepository,
    useCase,
  };
}

describe('CreatePaymentRequests', () => {
  it('server側current userから複数人分の個別金額請求を作成する', async () => {
    const { currentUserRepository, paymentRequestRepository, useCase } =
      createUseCase();

    await expect(
      useCase.execute(CURRENT_USER_PUBLIC_ID, {
        requests: [
          { recipientId: RECIPIENT_ONE_ID, amount: 1_500 },
          { recipientId: RECIPIENT_TWO_ID, amount: 2_800 },
        ],
      }),
    ).resolves.toEqual([
      {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        requesterId: CURRENT_USER_INTERNAL_ID,
        recipientId: RECIPIENT_ONE_ID,
        amount: 1_500,
        status: 'pending',
      },
      {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        requesterId: CURRENT_USER_INTERNAL_ID,
        recipientId: RECIPIENT_TWO_ID,
        amount: 2_800,
        status: 'pending',
      },
    ]);
    expect(currentUserRepository.findByUserId).toHaveBeenCalledWith(
      CURRENT_USER_PUBLIC_ID,
    );
    expect(paymentRequestRepository.saveAll).toHaveBeenCalledWith([
      {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        requesterId: CURRENT_USER_INTERNAL_ID,
        recipientId: RECIPIENT_ONE_ID,
        amount: 1_500,
      },
      {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        requesterId: CURRENT_USER_INTERNAL_ID,
        recipientId: RECIPIENT_TWO_ID,
        amount: 2_800,
      },
    ]);
  });

  it.each([
    [null, 'requests'],
    [{}, 'requests'],
    [{ requests: [] }, 'at least one'],
    [{ requests: [{ recipientId: 'invalid', amount: 100 }] }, 'recipientId'],
    [{ requests: [{ recipientId: RECIPIENT_ONE_ID, amount: 0 }] }, 'amount'],
    [{ requests: [{ recipientId: RECIPIENT_ONE_ID, amount: 1.5 }] }, 'amount'],
    // 上限（80,000円）を1円でも超える請求は受理しない。
    [
      { requests: [{ recipientId: RECIPIENT_ONE_ID, amount: 80_001 }] },
      'amount',
    ],
    // 安全な整数でも上限を超えれば受理しない（桁数ではなく上限で弾く）。
    [
      {
        requests: [
          { recipientId: RECIPIENT_ONE_ID, amount: Number.MAX_SAFE_INTEGER },
        ],
      },
      'amount',
    ],
    [
      {
        requests: [
          { recipientId: RECIPIENT_ONE_ID, amount: 100 },
          { recipientId: RECIPIENT_ONE_ID.toUpperCase(), amount: 200 },
        ],
      },
      'unique',
    ],
  ])('不正な入力を拒否する: %j', async (input, expectedMessage) => {
    const { paymentRequestRepository, useCase } = createUseCase();

    await expect(
      useCase.execute(CURRENT_USER_PUBLIC_ID, input),
    ).rejects.toThrow(expectedMessage);
    expect(paymentRequestRepository.saveAll).not.toHaveBeenCalled();
  });

  // 上限直下（79,999円）と上限ちょうど（80,000円）はどちらも請求できる。
  it.each([79_999, 80_000])('上限以下（%i円）は請求できる', async (amount) => {
    const { paymentRequestRepository, useCase } = createUseCase();

    await expect(
      useCase.execute(CURRENT_USER_PUBLIC_ID, {
        requests: [{ recipientId: RECIPIENT_ONE_ID, amount }],
      }),
    ).resolves.toEqual([
      {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        requesterId: CURRENT_USER_INTERNAL_ID,
        recipientId: RECIPIENT_ONE_ID,
        amount,
        status: 'pending',
      },
    ]);
    expect(paymentRequestRepository.saveAll).toHaveBeenCalledWith([
      {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        requesterId: CURRENT_USER_INTERNAL_ID,
        recipientId: RECIPIENT_ONE_ID,
        amount,
      },
    ]);
  });

  it('複数件すべてが上限以下なら請求できる', async () => {
    const { useCase } = createUseCase();

    await expect(
      useCase.execute(CURRENT_USER_PUBLIC_ID, {
        requests: [
          { recipientId: RECIPIENT_ONE_ID, amount: 79_999 },
          { recipientId: RECIPIENT_TWO_ID, amount: 80_000 },
        ],
      }),
    ).resolves.toEqual([
      {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        requesterId: CURRENT_USER_INTERNAL_ID,
        recipientId: RECIPIENT_ONE_ID,
        amount: 79_999,
        status: 'pending',
      },
      {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        requesterId: CURRENT_USER_INTERNAL_ID,
        recipientId: RECIPIENT_TWO_ID,
        amount: 80_000,
        status: 'pending',
      },
    ]);
  });

  it('複数件のうち1件でも上限を超えると全体を拒否し、保存しない', async () => {
    const { paymentRequestRepository, useCase } = createUseCase();

    await expect(
      useCase.execute(CURRENT_USER_PUBLIC_ID, {
        requests: [
          { recipientId: RECIPIENT_ONE_ID, amount: 80_000 },
          { recipientId: RECIPIENT_TWO_ID, amount: 80_001 },
        ],
      }),
    ).rejects.toBeInstanceOf(InvalidPaymentRequestError);
    expect(paymentRequestRepository.saveAll).not.toHaveBeenCalled();
  });

  it('一度に50件を超える請求を拒否する', async () => {
    const { useCase } = createUseCase();
    const requests = Array.from({ length: 51 }, (_, index) => ({
      recipientId: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
      amount: 100,
    }));

    await expect(
      useCase.execute(CURRENT_USER_PUBLIC_ID, { requests }),
    ).rejects.toThrow('at most 50');
  });

  it('current user自身への請求を拒否する', async () => {
    const { paymentRequestRepository, useCase } = createUseCase();

    await expect(
      useCase.execute(CURRENT_USER_PUBLIC_ID, {
        requests: [{ recipientId: CURRENT_USER_INTERNAL_ID, amount: 100 }],
      }),
    ).rejects.toBeInstanceOf(InvalidPaymentRequestError);
    expect(paymentRequestRepository.saveAll).not.toHaveBeenCalled();
  });

  it('mock current userが存在しなければ404用errorにする', async () => {
    const { useCase } = createUseCase({ currentUserExists: false });

    await expect(
      useCase.execute(CURRENT_USER_PUBLIC_ID, {
        requests: [{ recipientId: RECIPIENT_ONE_ID, amount: 100 }],
      }),
    ).rejects.toBeInstanceOf(CurrentUserNotFoundError);
  });
});
