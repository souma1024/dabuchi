const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface Friendship {
  id: string;
  user1Id: string;
  user2Id: string;
  addedById: string;
  createdAt: string;
}

export interface FriendshipPair {
  user1Id: string;
  user2Id: string;
}

export interface FriendProfile {
  id: string;
  userId: string;
  name: string;
  profileUrl: string;
}

export class InvalidFriendshipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidFriendshipError';
  }
}

export function createFriendshipPair(
  firstUserId: string,
  secondUserId: string,
): FriendshipPair {
  const first = normalizeUuid(firstUserId);
  const second = normalizeUuid(secondUserId);

  if (first === second) {
    throw new InvalidFriendshipError(
      'A user cannot create a friendship with themselves.',
    );
  }

  return first < second
    ? { user1Id: first, user2Id: second }
    : { user1Id: second, user2Id: first };
}

function normalizeUuid(value: string): string {
  if (!UUID_PATTERN.test(value)) {
    throw new InvalidFriendshipError('A friendship user ID must be a UUID.');
  }

  return value.toLowerCase();
}
