import type {
  TransactionCursor,
  TransactionSort,
} from '../../application/ports/transactionRepository.js';
import { isRealMysqlDateTime } from '../../shared/mysqlDateTime.js';

const NUMERIC_ID_PATTERN = /^\d+$/;

export function isTransactionSort(value: string): value is TransactionSort {
  return value === 'created-asc' || value === 'created-desc';
}
export function encodeTransactionCursor(cursor: TransactionCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function decodeTransactionCursor(
  value: string,
): TransactionCursor | null {
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    );

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('sort' in parsed) ||
      !('value' in parsed) ||
      typeof parsed.sort !== 'string' ||
      !isTransactionSort(parsed.sort) ||
      typeof parsed.value !== 'object' ||
      parsed.value === null ||
      !('createdAt' in parsed.value) ||
      !('id' in parsed.value) ||
      typeof parsed.value.createdAt !== 'string' ||
      typeof parsed.value.id !== 'string' ||
      !isRealMysqlDateTime(parsed.value.createdAt) ||
      !NUMERIC_ID_PATTERN.test(parsed.value.id)
    ) {
      return null;
    }

    return {
      sort: parsed.sort,
      value: { createdAt: parsed.value.createdAt, id: parsed.value.id },
    };
  } catch {
    return null;
  }
}
