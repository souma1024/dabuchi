const FOREIGN_KEY_VIOLATION_CODE = 'ER_NO_REFERENCED_ROW_2';

export function isForeignKeyViolation(
  error: unknown,
): error is { code: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === FOREIGN_KEY_VIOLATION_CODE
  );
}
