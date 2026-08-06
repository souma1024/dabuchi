import {
  DEFAULT_TRANSACTION_SORT,
  type Transaction,
  type TransactionPage,
  type TransactionSort,
} from '../types';

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '';

interface TransactionResponse {
  id: string;
  counterparty: {
    id: string;
    name: string;
    profileUrl: string;
  };
  amount: number;
  direction: 'sent' | 'received';
  createdAt: string;
}

interface TransactionsResponse {
  transactions: TransactionResponse[];
  pageInfo: {
    nextCursor: string | null;
    hasNextPage: boolean;
  };
}

function invalidResponseError(): Error {
  return new Error('取引履歴の取得に失敗しました（不正なレスポンス）');
}

function isTransactionResponse(value: unknown): value is TransactionResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const transaction = value as Record<string, unknown>;
  const counterparty = transaction.counterparty;

  return (
    typeof transaction.id === 'string' &&
    typeof transaction.amount === 'number' &&
    Number.isSafeInteger(transaction.amount) &&
    transaction.amount > 0 &&
    (transaction.direction === 'sent' ||
      transaction.direction === 'received') &&
    typeof transaction.createdAt === 'string' &&
    typeof counterparty === 'object' &&
    counterparty !== null &&
    typeof (counterparty as Record<string, unknown>).id === 'string' &&
    typeof (counterparty as Record<string, unknown>).name === 'string' &&
    typeof (counterparty as Record<string, unknown>).profileUrl === 'string'
  );
}

function parseTransactionsResponse(data: unknown): TransactionsResponse {
  if (typeof data !== 'object' || data === null) {
    throw invalidResponseError();
  }
  const body = data as Record<string, unknown>;

  if (!Array.isArray(body.transactions)) {
    throw invalidResponseError();
  }

  const transactions: TransactionResponse[] = [];
  for (const item of body.transactions as unknown[]) {
    if (!isTransactionResponse(item)) {
      throw invalidResponseError();
    }
    transactions.push(item);
  }

  const pageInfo = body.pageInfo;
  if (typeof pageInfo !== 'object' || pageInfo === null) {
    throw invalidResponseError();
  }
  const info = pageInfo as Record<string, unknown>;
  if (info.nextCursor !== null && typeof info.nextCursor !== 'string') {
    throw invalidResponseError();
  }
  if (typeof info.hasNextPage !== 'boolean') {
    throw invalidResponseError();
  }

  return {
    transactions,
    pageInfo: {
      nextCursor: info.nextCursor,
      hasNextPage: info.hasNextPage,
    },
  };
}

function buildTransactionsUrl(
  currentUserId: string,
  cursor: string | null,
  sort: TransactionSort,
): URL {
  const base = API_BASE_URL || window.location.origin;
  const url = new URL(
    `/api/users/${encodeURIComponent(currentUserId)}/transactions`,
    base,
  );
  url.searchParams.set('sort', sort);
  if (cursor) {
    url.searchParams.set('cursor', cursor);
  }
  return url;
}

export async function fetchTransactions(
  currentUserId: string,
  cursor: string | null = null,
  sort: TransactionSort = DEFAULT_TRANSACTION_SORT,
  signal?: AbortSignal,
): Promise<TransactionPage> {
  const response = await fetch(
    buildTransactionsUrl(currentUserId, cursor, sort),
    { signal },
  );
  if (!response.ok) {
    throw new Error(`取引履歴の取得に失敗しました (HTTP ${response.status})`);
  }

  const data: unknown = await response.json();
  const parsed = parseTransactionsResponse(data);

  return {
    transactions: parsed.transactions.map(
      (transaction) =>
        ({
          id: transaction.id,
          counterparty: transaction.counterparty,
          amount: transaction.amount,
          direction: transaction.direction,
          createdAt: transaction.createdAt,
        }) satisfies Transaction,
    ),
    nextCursor: parsed.pageInfo.nextCursor,
  };
}
