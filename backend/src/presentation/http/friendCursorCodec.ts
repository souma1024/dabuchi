import type {
  BlockedFriendCursor,
  FriendshipCursor,
} from '../../application/ports/friendQueryRepository.js';
import { isRealMysqlDateTime } from '../../shared/mysqlDateTime.js';
import { isUuid } from './recipientCursorCodec.js';

export function encodeFriendCursor(cursor: FriendshipCursor): string {
  return encodeCursor(cursor);
}

export function decodeFriendCursor(value: string): FriendshipCursor | null {
  const parsed = decodeCursor(value);

  if (
    !parsed ||
    !isValidDateTime(parsed.createdAt) ||
    !isUuidValue(parsed.id)
  ) {
    return null;
  }

  return { createdAt: parsed.createdAt, id: parsed.id };
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
