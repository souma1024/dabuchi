import type {
  RecipientCursor,
  RecipientSort,
} from '../../application/ports/userRecipientRepository.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MYSQL_DATETIME_PATTERN =
  /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d{1,6})?$/;
const RECIPIENT_SORTS = ['created-asc', 'created-desc', 'name-asc'] as const;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function encodeRecipientCursor(cursor: RecipientCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

function isRecipientSort(value: unknown): value is RecipientSort {
  return (
    typeof value === 'string' &&
    RECIPIENT_SORTS.includes(value as (typeof RECIPIENT_SORTS)[number])
  );
}

export function decodeRecipientCursor(value: string): RecipientCursor | null {
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    );

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('sort' in parsed) ||
      !('value' in parsed) ||
      !isRecipientSort(parsed.sort) ||
      typeof parsed.value !== 'object' ||
      parsed.value === null
    ) {
      return null;
    }

    if (parsed.sort === 'name-asc') {
      if (
        !('name' in parsed.value) ||
        !('id' in parsed.value) ||
        typeof parsed.value.name !== 'string' ||
        typeof parsed.value.id !== 'string' ||
        !isUuid(parsed.value.id)
      ) {
        return null;
      }

      return {
        sort: parsed.sort,
        value: { name: parsed.value.name, id: parsed.value.id },
      };
    }

    if (
      !('createdAt' in parsed.value) ||
      !('id' in parsed.value) ||
      typeof parsed.value.createdAt !== 'string' ||
      typeof parsed.value.id !== 'string' ||
      !MYSQL_DATETIME_PATTERN.test(parsed.value.createdAt) ||
      !isUuid(parsed.value.id)
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
