import type { TransactionCursor } from '../../application/ports/transactionRepository.js';
import { isRealMysqlDateTime } from '../../shared/mysqlDateTime.js';

const NUMERIC_ID_PATTERN = /^\d+$/;

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
      !('createdAt' in parsed) ||
      !('id' in parsed) ||
      typeof parsed.createdAt !== 'string' ||
      typeof parsed.id !== 'string' ||
      !isRealMysqlDateTime(parsed.createdAt) ||
      !NUMERIC_ID_PATTERN.test(parsed.id)
    ) {
      return null;
    }

    return { createdAt: parsed.createdAt, id: parsed.id };
  } catch {
    return null;
  }
}
