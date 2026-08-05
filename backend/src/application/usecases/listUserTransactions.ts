import { CurrentUserNotFoundError } from '../errors/currentUserNotFoundError.js';
import type { Transaction } from '../../domain/transaction.js';
import { mysqlDateTimeToIso } from '../../shared/mysqlDateTime.js';
import type {
  TransactionCursor,
  TransactionRepository,
} from '../ports/transactionRepository.js';

const TRANSACTION_PAGE_SIZE = 20;

export interface ListUserTransactionsInput {
  currentUserId: string;
  cursor: TransactionCursor | null;
}

export interface ListUserTransactionsResult {
  transactions: Transaction[];
  nextCursor: TransactionCursor | null;
}

export class ListUserTransactions {
  constructor(private readonly repository: TransactionRepository) {}

  async execute(
    input: ListUserTransactionsInput,
  ): Promise<ListUserTransactionsResult> {
    const currentUserExists = await this.repository.existsById(
      input.currentUserId,
    );

    if (!currentUserExists) {
      throw new CurrentUserNotFoundError();
    }

    const records = await this.repository.findTransactions({
      currentUserId: input.currentUserId,
      cursor: input.cursor,
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
