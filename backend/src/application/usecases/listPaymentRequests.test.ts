import { describe, expect, it } from 'vitest';

import { createCurrentUserRepository } from '../../test/factories/currentUserRepositoryFactory.js';
import {
  createPaymentRequestListRepository,
  createPaymentRequestRecord,
  createPaymentRequestRecords,
} from '../../test/factories/paymentRequestListFactory.js';
import { CurrentUserNotFoundError } from '../errors/currentUserNotFoundError.js';
import type { PaymentRequestListRepository } from '../ports/paymentRequestListRepository.js';
import { ListPaymentRequests } from './listPaymentRequests.js';

// 受け取るのは公開user_id。内部UUIDへ解決してからpayment_requestsを引く。
const CURRENT_USER_PUBLIC_ID = 'friend-001';
const CURRENT_USER_INTERNAL_ID = '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001';

function createUsecase(listRepository: PaymentRequestListRepository) {
  return new ListPaymentRequests(
    createCurrentUserRepository({
      user: {
        id: CURRENT_USER_INTERNAL_ID,
        name: '山田 太郎',
        profileUrl: '/assets/profiles/human1.png',
        balance: 120000,
      },
    }),
    listRepository,
  );
}

function createInput(overrides = {}) {
  return {
    currentUserId: CURRENT_USER_PUBLIC_ID,
    direction: 'received' as const,
    status: null,
    cursor: null,
    ...overrides,
  };
}

describe('ListPaymentRequests', () => {
  it('現在ユーザーが存在しなければエラーにする', async () => {
    const usecase = new ListPaymentRequests(
      createCurrentUserRepository({ user: null }),
      createPaymentRequestListRepository(),
    );

    await expect(usecase.execute(createInput())).rejects.toBeInstanceOf(
      CurrentUserNotFoundError,
    );
  });

  it('公開user_idを内部UUIDへ解決してからrepositoryへ渡す', async () => {
    const repository = createPaymentRequestListRepository();

    await createUsecase(repository).execute(createInput());

    expect(repository.findPaymentRequests).toHaveBeenCalledWith({
      currentUserInternalId: CURRENT_USER_INTERNAL_ID,
      direction: 'received',
      status: null,
      cursor: null,
      limit: 21,
    });
  });

  it('21件返ったら20件に切り、次ページカーソルを作る', async () => {
    const records = createPaymentRequestRecords(21);
    const usecase = createUsecase(
      createPaymentRequestListRepository({ records }),
    );

    const result = await usecase.execute(createInput());

    expect(result.requests).toHaveLength(20);
    expect(result.nextCursor).toEqual({
      createdAt: records[19]?.createdAt,
      id: records[19]?.id,
    });
  });

  it('ちょうど20件なら次ページカーソルはnullになる', async () => {
    const usecase = createUsecase(
      createPaymentRequestListRepository({
        records: createPaymentRequestRecords(20),
      }),
    );

    const result = await usecase.execute(createInput());

    expect(result.requests).toHaveLength(20);
    expect(result.nextCursor).toBeNull();
  });

  it('相手をネストし、日時をISO 8601へ変換する', async () => {
    const record = createPaymentRequestRecord(1, {
      amount: 3000,
      status: 'accepted',
      createdAt: '2026-08-03 01:00:00.000000',
      respondedAt: '2026-08-04 02:30:00.500000',
    });
    const usecase = createUsecase(
      createPaymentRequestListRepository({ records: [record] }),
    );

    const result = await usecase.execute(createInput());

    expect(result.requests[0]).toEqual({
      id: record.id,
      counterparty: {
        id: record.counterpartyId,
        name: record.counterpartyName,
        profileUrl: record.counterpartyProfileUrl,
      },
      amount: 3000,
      status: 'accepted',
      createdAt: '2026-08-03T01:00:00.000Z',
      respondedAt: '2026-08-04T02:30:00.500Z',
    });
  });

  it('未応答の請求はrespondedAtをnullのまま返す', async () => {
    const usecase = createUsecase(
      createPaymentRequestListRepository({
        records: [createPaymentRequestRecord(1, { respondedAt: null })],
      }),
    );

    const result = await usecase.execute(createInput());

    expect(result.requests[0]?.respondedAt).toBeNull();
  });

  it('directionとstatusをrepositoryへそのまま渡す', async () => {
    const repository = createPaymentRequestListRepository();

    await createUsecase(repository).execute(
      createInput({ direction: 'sent', status: 'pending' }),
    );

    expect(repository.findPaymentRequests).toHaveBeenCalledWith(
      expect.objectContaining({ direction: 'sent', status: 'pending' }),
    );
  });
});
