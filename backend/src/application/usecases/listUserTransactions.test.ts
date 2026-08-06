import { describe, expect, it, vi } from 'vitest';

import { CurrentUserNotFoundError } from '../errors/currentUserNotFoundError.js';
import { createTransactionRecords } from '../../test/factories/transactionFactory.js';
import { createTransactionRepository } from '../../test/factories/transactionRepositoryFactory.js';
import { ListUserTransactions } from './listUserTransactions.js';

const CURRENT_USER_ID = '11111111-1111-4111-8111-111111111111';

describe('ListUserTransactions', () => {
  it('20件を返し、21件目があれば次のカーソルを返す', async () => {
    const records = createTransactionRecords(21);
    const repository = createTransactionRepository({ transactions: records });
    const useCase = new ListUserTransactions(repository);

    const result = await useCase.execute({
      currentUserId: CURRENT_USER_ID,
      cursor: null,
    });

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
    expect(repository.findTransactions).toHaveBeenCalledWith({
      currentUserId: CURRENT_USER_ID,
      cursor: null,
      limit: 21,
      sort: 'created-desc',
    });
  });

  it('20件以下なら次のカーソルを返さない', async () => {
    const repository = createTransactionRepository({
      transactions: createTransactionRecords(20),
    });
    const useCase = new ListUserTransactions(repository);

    const result = await useCase.execute({
      currentUserId: CURRENT_USER_ID,
      cursor: null,
    });

    expect(result.transactions).toHaveLength(20);
    expect(result.nextCursor).toBeNull();
  });

  it('現在のユーザーが存在しなければ取引履歴を検索しない', async () => {
    const repository = createTransactionRepository({
      currentUserExists: false,
    });
    const useCase = new ListUserTransactions(repository);

    await expect(
      useCase.execute({ currentUserId: CURRENT_USER_ID, cursor: null }),
    ).rejects.toBeInstanceOf(CurrentUserNotFoundError);
    expect(repository.findTransactions).not.toHaveBeenCalled();
  });

  it('受け取ったカーソルをリポジトリへ渡す', async () => {
    const repository = createTransactionRepository();
    const useCase = new ListUserTransactions(repository);
    const cursor = {
      sort: 'created-desc' as const,
      value: {
        createdAt: '2026-08-04 12:00:20.000000',
        id: '20',
      },
    };

    await useCase.execute({ currentUserId: CURRENT_USER_ID, cursor });

    expect(repository.findTransactions).toHaveBeenCalledWith({
      currentUserId: CURRENT_USER_ID,
      cursor,
      limit: 21,
      sort: 'created-desc',
    });
    expect(vi.mocked(repository.existsById)).toHaveBeenCalledWith(
      CURRENT_USER_ID,
    );
  });

  it('created-ascでは同じsortで次のカーソルを返す', async () => {
    const records = createTransactionRecords(21).reverse();
    const repository = createTransactionRepository({ transactions: records });
    const useCase = new ListUserTransactions(repository);

    const result = await useCase.execute({
      currentUserId: CURRENT_USER_ID,
      cursor: null,
      sort: 'created-asc',
    });

    expect(result.nextCursor).toEqual({
      sort: 'created-asc',
      value: {
        createdAt: records[19]?.createdAt,
        id: records[19]?.id,
      },
    });
    expect(repository.findTransactions).toHaveBeenCalledWith({
      currentUserId: CURRENT_USER_ID,
      cursor: null,
      limit: 21,
      sort: 'created-asc',
    });
  });
});
