const FOREIGN_KEY_VIOLATION_CODE = 'ER_NO_REFERENCED_ROW_2';
const DUPLICATE_ENTRY_CODE = 'ER_DUP_ENTRY';
// InnoDB がデッドロック検出・ロック待ちタイムアウトで返す一時的エラー。再試行で回復しうる。
const TRANSIENT_TRANSACTION_CODES = new Set([
  'ER_LOCK_DEADLOCK',
  'ER_LOCK_WAIT_TIMEOUT',
]);

function hasStringCode(error: unknown): error is { code: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  );
}

export function isForeignKeyViolation(
  error: unknown,
): error is { code: string } {
  return hasStringCode(error) && error.code === FOREIGN_KEY_VIOLATION_CODE;
}

export function isDuplicateKeyViolation(
  error: unknown,
): error is { code: string } {
  return hasStringCode(error) && error.code === DUPLICATE_ENTRY_CODE;
}

export function isTransientTransactionError(
  error: unknown,
): error is { code: string } {
  return hasStringCode(error) && TRANSIENT_TRANSACTION_CODES.has(error.code);
}
