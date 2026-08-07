import { describe, expect, it } from 'vitest';

import { CurrentUserNotFoundError } from '../errors/currentUserNotFoundError.js';
import { createCurrentUser } from '../../test/factories/currentUserFactory.js';
import { createCurrentUserRepository } from '../../test/factories/currentUserRepositoryFactory.js';
import { createTransactionRecords } from '../../test/factories/transactionFactory.js';
import { createTransactionRepository } from '../../test/factories/transactionRepositoryFactory.js';
import { ListUserTransactions } from './listUserTransactions.js';

const CURRENT_USER_PUBLIC_ID = 'friend-001';
const CURRENT_USER_INTERNAL_ID = '11111111-1111-4111-8111-111111111111';

describe('ListUserTransactions', () => {
  it('公開user_idを内部UUIDへ解決し、20件と次カーソルを返す', async () => {
    const records = createTransactionRecords(21);
    const currentUserRepository = createCurrentUserRepository({
      user: createCurrentUser({ id: CURRENT_USER_INTERNAL_ID }),
    });
    const transactionRepository = createTransactionRepository({
      transactions: records,
    });
    const useCase = new ListUserTransactions(
      currentUserRepository,
      transactionRepository,
    );

    const result = await useCase.execute(CURRENT_USER_PUBLIC_ID, null);

    expect(currentUserRepository.findByUserId).toHaveBeenCalledWith(
      CURRENT_USER_PUBLIC_ID,
    );
    expect(result.transactions).toHaveLength(20);
    expect(result.transactions[0]).toEqual({
      id: records[0]?.id,
      counterparty: {
        id: records[0]?.counterpartyId,
        name: records[0]?.counterpartyName,
        profileUrl: records[0]?.counterpartyProfileUrl,
      },
      amount: records[0]?.amount,
      direction: records[0]?.direction,
      createdAt: '2026-08-04T12:00:01.000Z',
    });
    expect(result.nextCursor).toEqual({
      sort: 'created-desc',
      value: {
        createdAt: records[19]?.createdAt,
        id: records[19]?.id,
      },
    });
    // client値ではなく、解決した内部UUIDで検索されること
    expect(transactionRepository.findTransactions).toHaveBeenCalledWith({
      currentUserId: CURRENT_USER_INTERNAL_ID,
      cursor: null,
      limit: 21,
      sort: 'created-desc',
    });
  });

  it('20件以下なら次のカーソルを返さない', async () => {
    const useCase = new ListUserTransactions(
      createCurrentUserRepository({
        user: createCurrentUser({ id: CURRENT_USER_INTERNAL_ID }),
      }),
      createTransactionRepository({
        transactions: createTransactionRecords(20),
      }),
    );

    const result = await useCase.execute(CURRENT_USER_PUBLIC_ID, null);

    expect(result.transactions).toHaveLength(20);
    expect(result.nextCursor).toBeNull();
  });

  it('現在ユーザーが存在しなければ取引履歴を検索しない', async () => {
    const currentUserRepository = createCurrentUserRepository({ user: null });
    const transactionRepository = createTransactionRepository();
    const useCase = new ListUserTransactions(
      currentUserRepository,
      transactionRepository,
    );

    await expect(
      useCase.execute(CURRENT_USER_PUBLIC_ID, null),
    ).rejects.toBeInstanceOf(CurrentUserNotFoundError);
    expect(transactionRepository.findTransactions).not.toHaveBeenCalled();
  });

  it('受け取ったカーソルを内部UUIDとともにリポジトリへ渡す', async () => {
    const currentUserRepository = createCurrentUserRepository({
      user: createCurrentUser({ id: CURRENT_USER_INTERNAL_ID }),
    });
    const transactionRepository = createTransactionRepository();
    const useCase = new ListUserTransactions(
      currentUserRepository,
      transactionRepository,
    );
    const cursor = {
      sort: 'created-asc' as const,
      value: {
        createdAt: '2026-08-04 12:00:20.000000',
        id: '20',
      },
    };

    await useCase.execute(CURRENT_USER_PUBLIC_ID, cursor, 'created-asc');

    expect(transactionRepository.findTransactions).toHaveBeenCalledWith({
      currentUserId: CURRENT_USER_INTERNAL_ID,
      cursor,
      limit: 21,
      sort: 'created-asc',
    });
  });
});
