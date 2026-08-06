import type { CurrentUser } from '../../domain/currentUser.js';
import {
  FriendshipNotFoundError,
  InvalidFriendshipIdError,
} from '../errors/friendCommandErrors.js';
import { CurrentUserNotFoundError } from '../errors/currentUserNotFoundError.js';
import type { CurrentUserRepository } from '../ports/currentUserRepository.js';
import type {
  FriendCommandRepository,
  FriendshipCommandRecord,
} from '../ports/friendCommandRepository.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface WritableFriendship {
  currentUser: CurrentUser;
  friendship: FriendshipCommandRecord;
}

interface ResolveWritableFriendshipOptions {
  allowWhenBlockedByFriend?: boolean;
}

export async function resolveWritableFriendship(
  currentUserRepository: CurrentUserRepository,
  friendCommandRepository: FriendCommandRepository,
  currentUserPublicId: string,
  friendshipId: string,
  options: ResolveWritableFriendshipOptions = {},
): Promise<WritableFriendship> {
  if (!UUID_PATTERN.test(friendshipId)) {
    throw new InvalidFriendshipIdError();
  }

  const currentUser =
    await currentUserRepository.findByUserId(currentUserPublicId);

  if (!currentUser) {
    throw new CurrentUserNotFoundError();
  }

  const friendship = await friendCommandRepository.findFriendshipForUser({
    currentUserId: currentUser.id,
    friendshipId: friendshipId.toLowerCase(),
  });

  if (
    !friendship ||
    (friendship.blocksCurrentUser &&
      !friendship.blockedByCurrentUser &&
      !options.allowWhenBlockedByFriend)
  ) {
    throw new FriendshipNotFoundError();
  }

  return { currentUser, friendship };
}
