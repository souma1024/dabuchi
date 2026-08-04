import type { RecipientCursor } from '../../application/ports/userRecipientRepository.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MYSQL_DATETIME_PATTERN =
  /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d{1,6})?$/;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function encodeRecipientCursor(cursor: RecipientCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function decodeRecipientCursor(value: string): RecipientCursor | null {
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
      !MYSQL_DATETIME_PATTERN.test(parsed.createdAt) ||
      !isUuid(parsed.id)
    ) {
      return null;
    }

    return { createdAt: parsed.createdAt, id: parsed.id };
  } catch {
    return null;
  }
}
