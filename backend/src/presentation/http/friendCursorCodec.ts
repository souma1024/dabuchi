import type {
  BlockedFriendCursor,
  FriendSort,
  FriendshipCursor,
} from '../../application/ports/friendQueryRepository.js';
import { isRealMysqlDateTime } from '../../shared/mysqlDateTime.js';
import { isUuid } from './recipientCursorCodec.js';

export function isFriendSort(value: string): value is FriendSort {
  return value === 'created-asc' || value === 'created-desc';
}

export function encodeFriendCursor(cursor: FriendshipCursor): string {
  return encodeCursor(cursor);
}

export function decodeFriendCursor(value: string): FriendshipCursor | null {
  const parsed = decodeCursor(value);

  if (
    !parsed ||
    !('sort' in parsed) ||
    !('value' in parsed) ||
    typeof parsed.sort !== 'string' ||
    !isFriendSort(parsed.sort) ||
    typeof parsed.value !== 'object' ||
    parsed.value === null ||
    !('createdAt' in parsed.value) ||
    !('id' in parsed.value) ||
    !isValidDateTime(parsed.value.createdAt) ||
    !isUuidValue(parsed.value.id)
  ) {
    return null;
  }

  return {
    sort: parsed.sort,
    value: { createdAt: parsed.value.createdAt, id: parsed.value.id },
  };
}

export function encodeBlockedFriendCursor(cursor: BlockedFriendCursor): string {
  return encodeCursor(cursor);
}

export function decodeBlockedFriendCursor(
  value: string,
): BlockedFriendCursor | null {
  const parsed = decodeCursor(value);

  if (
    !parsed ||
    !isValidDateTime(parsed.blockedAt) ||
    !isUuidValue(parsed.friendshipId)
  ) {
    return null;
  }

  return {
    blockedAt: parsed.blockedAt,
    friendshipId: parsed.friendshipId,
  };
}

function encodeCursor(cursor: object): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

function decodeCursor(value: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    );

    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidDateTime(value: unknown): value is string {
  return typeof value === 'string' && isRealMysqlDateTime(value);
}

function isUuidValue(value: unknown): value is string {
  return typeof value === 'string' && isUuid(value);
}
