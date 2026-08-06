import type {
  Counterparty,
  Transaction,
  TransactionDirection,
  TransactionPage,
} from '../types';

// 未設定なら同一オリジン（Vite dev serverの /api プロキシ経由）を使う。
const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '';

const directions: readonly TransactionDirection[] = ['sent', 'received'];

function invalidResponseError(): Error {
  return new Error('取引履歴の取得に失敗しました（不正なレスポンス）');
}

function isCounterparty(value: unknown): value is Counterparty {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const counterparty = value as Record<string, unknown>;
  return (
    typeof counterparty.id === 'string' &&
    typeof counterparty.name === 'string' &&
    typeof counterparty.profileUrl === 'string'
  );
}

function isTransaction(value: unknown): value is Transaction {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const transaction = value as Record<string, unknown>;
  return (
    // idはtransfers.id(BIGINT)の文字列。桁溢れを避けるため数値化しない。
    typeof transaction.id === 'string' &&
    isCounterparty(transaction.counterparty) &&
    // amountはAPI仕様で正の整数（円）。
    typeof transaction.amount === 'number' &&
    Number.isSafeInteger(transaction.amount) &&
    transaction.amount > 0 &&
    directions.some((direction) => direction === transaction.direction) &&
    // 文字列であっても日付として解釈できなければ、表示時に日時が空欄になるため弾く。
    typeof transaction.createdAt === 'string' &&
    !Number.isNaN(new Date(transaction.createdAt).getTime())
  );
}

/** 外部入力であるレスポンスを実行時に検証する（型を盲信しない）。 */
function parseTransactionsResponse(data: unknown): TransactionPage {
  if (typeof data !== 'object' || data === null) {
    throw invalidResponseError();
  }
  const body = data as Record<string, unknown>;

  const rawTransactions = body.transactions;
  if (!Array.isArray(rawTransactions)) {
    throw invalidResponseError();
  }
  const transactions: Transaction[] = [];
  for (const item of rawTransactions as unknown[]) {
    if (!isTransaction(item)) {
      throw invalidResponseError();
    }
    transactions.push(item);
  }

  const pageInfo = body.pageInfo;
  if (typeof pageInfo !== 'object' || pageInfo === null) {
    throw invalidResponseError();
  }
  const nextCursor = (pageInfo as Record<string, unknown>).nextCursor;
  if (nextCursor !== null && typeof nextCursor !== 'string') {
    throw invalidResponseError();
  }

  // hasNextPageはnextCursorの有無から判定できるため、画面側へは持ち出さない。
  return { transactions, nextCursor };
}

function buildTransactionsUrl(
  currentUserId: string,
  cursor: string | null,
): URL {
  const base = API_BASE_URL || window.location.origin;
  const url = new URL(
    `/api/users/${encodeURIComponent(currentUserId)}/transactions`,
    base,
  );
  if (cursor) {
    url.searchParams.set('cursor', cursor);
  }
  return url;
}

/**
 * 取引履歴を1ページ分（20件）取得する。
 * 送受金の統合と「相手」の算出、並び順、ページングはバックエンドの責務。
 * 追加ページは呼び出し側(useTransactions)がnextCursorを使って取得する。
 */
export async function fetchTransactions(
  currentUserId: string,
  cursor: string | null = null,
  signal?: AbortSignal,
): Promise<TransactionPage> {
  const response = await fetch(buildTransactionsUrl(currentUserId, cursor), {
    signal,
  });
  if (!response.ok) {
    throw new Error(`取引履歴の取得に失敗しました (HTTP ${response.status})`);
  }

  const data: unknown = await response.json();
  return parseTransactionsResponse(data);
}
