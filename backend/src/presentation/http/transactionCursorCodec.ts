import type {
  TransactionCursor,
  TransactionSort,
} from '../../application/ports/transactionRepository.js';

const NUMERIC_ID_PATTERN = /^\d+$/;
const MYSQL_DATETIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?$/;
const TRANSACTION_SORTS = ['created-desc', 'created-asc'] as const;

// 形式だけでなく、実在するカレンダー日時であることを検証する。
// 2026-99-99 99:99:99 や 2026-02-30 のような値を弾き、不正カーソルを400に導く。
function isRealMysqlDateTime(value: string): boolean {
  const match = MYSQL_DATETIME_PATTERN.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

  // 存在しない月/日/時刻はDateが桁上がりで正規化されるため、成分の一致で検出する。
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getUTCHours() === hour &&
    date.getUTCMinutes() === minute &&
    date.getUTCSeconds() === second
  );
}

export function encodeTransactionCursor(cursor: TransactionCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

function isTransactionSort(value: unknown): value is TransactionSort {
  return (
    typeof value === 'string' &&
    TRANSACTION_SORTS.includes(value as TransactionSort)
  );
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
      value: {
        createdAt: parsed.value.createdAt,
        id: parsed.value.id,
      },
    };
  } catch {
    return null;
  }
}
