import { CurrentUserNotFoundError } from '../errors/currentUserNotFoundError.js';
import type { CurrentUserRepository } from '../ports/currentUserRepository.js';
import type { Transaction } from '../../domain/transaction.js';
import { mysqlDateTimeToIso } from '../../shared/mysqlDateTime.js';
import type {
  TransactionCursor,
  TransactionRepository,
} from '../ports/transactionRepository.js';

const TRANSACTION_PAGE_SIZE = 20;

export interface ListUserTransactionsResult {
  transactions: Transaction[];
  nextCursor: TransactionCursor | null;
}

export class ListUserTransactions {
  constructor(
    private readonly currentUserRepository: CurrentUserRepository,
    private readonly transactionRepository: TransactionRepository,
  ) {}

  async execute(
    currentUserId: string,
    cursor: TransactionCursor | null,
  ): Promise<ListUserTransactionsResult> {
    // currentUserId は server session の公開 user_id。内部UUIDへ解決し、
    // 同時に存在確認も兼ねる（client からユーザーを指定させない）。
    const currentUser =
      await this.currentUserRepository.findByUserId(currentUserId);

    if (!currentUser) {
      throw new CurrentUserNotFoundError();
    }

    const records = await this.transactionRepository.findTransactions({
      currentUserId: currentUser.id,
      cursor,
      limit: TRANSACTION_PAGE_SIZE + 1,
    });
    const hasNextPage = records.length > TRANSACTION_PAGE_SIZE;
    const visibleRecords = records.slice(0, TRANSACTION_PAGE_SIZE);
    const lastVisibleRecord = visibleRecords.at(-1);

    return {
      transactions: visibleRecords.map((record) => ({
        id: record.id,
        counterparty: {
          id: record.counterpartyId,
          name: record.counterpartyName,
          profileUrl: record.counterpartyProfileUrl,
        },
        amount: record.amount,
        direction: record.direction,
        createdAt: mysqlDateTimeToIso(record.createdAt),
      })),
      nextCursor:
        hasNextPage && lastVisibleRecord
          ? { createdAt: lastVisibleRecord.createdAt, id: lastVisibleRecord.id }
          : null,
    };
  }
}
