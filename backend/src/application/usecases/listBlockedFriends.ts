import type { CurrentUserRepository } from '../ports/currentUserRepository.js';
import type {
  BlockedFriendCursor,
  FriendQueryRepository,
} from '../ports/friendQueryRepository.js';
import {
  toBlockedFriendResult,
  type BlockedFriendResult,
} from './friendQueryResult.js';
import { resolveCurrentUser } from './resolveCurrentUser.js';

const BLOCKED_FRIEND_PAGE_SIZE = 20;

export interface ListBlockedFriendsInput {
  currentUserPublicId: string;
  cursor: BlockedFriendCursor | null;
}

export interface ListBlockedFriendsResult {
  friends: BlockedFriendResult[];
  nextCursor: BlockedFriendCursor | null;
}

export class ListBlockedFriends {
  constructor(
    private readonly currentUserRepository: CurrentUserRepository,
    private readonly friendQueryRepository: FriendQueryRepository,
  ) {}

  async execute(
    input: ListBlockedFriendsInput,
  ): Promise<ListBlockedFriendsResult> {
    const currentUser = await resolveCurrentUser(
      this.currentUserRepository,
      input.currentUserPublicId,
    );
    const records = await this.friendQueryRepository.findBlockedFriends({
      currentUserId: currentUser.id,
      cursor: input.cursor,
      limit: BLOCKED_FRIEND_PAGE_SIZE + 1,
    });
    const hasNextPage = records.length > BLOCKED_FRIEND_PAGE_SIZE;
    const visibleRecords = records.slice(0, BLOCKED_FRIEND_PAGE_SIZE);
    const lastRecord = visibleRecords.at(-1);

    return {
      friends: visibleRecords.map(toBlockedFriendResult),
      nextCursor:
        hasNextPage && lastRecord
          ? {
              blockedAt: lastRecord.blockedAt,
              friendshipId: lastRecord.friendshipId,
            }
          : null,
    };
  }
}
