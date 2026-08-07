import type {
  FriendSort,
  FriendQueryRepository,
  FriendshipCursor,
} from '../ports/friendQueryRepository.js';
import type { CurrentUserRepository } from '../ports/currentUserRepository.js';
import { resolveCurrentUser } from './resolveCurrentUser.js';
import { toFriendResult, type FriendResult } from './friendQueryResult.js';

const FRIEND_PAGE_SIZE = 20;
const DEFAULT_FRIEND_SORT: FriendSort = 'created-asc';

export interface ListFriendsInput {
  currentUserPublicId: string;
  cursor: FriendshipCursor | null;
  sort?: FriendSort;
}

export interface ListFriendsResult {
  friends: FriendResult[];
  nextCursor: FriendshipCursor | null;
}

export class ListFriends {
  constructor(
    private readonly currentUserRepository: CurrentUserRepository,
    private readonly friendQueryRepository: FriendQueryRepository,
  ) {}

  async execute(input: ListFriendsInput): Promise<ListFriendsResult> {
    const sort = input.sort ?? DEFAULT_FRIEND_SORT;
    const currentUser = await resolveCurrentUser(
      this.currentUserRepository,
      input.currentUserPublicId,
    );
    const records = await this.friendQueryRepository.findFriends({
      currentUserId: currentUser.id,
      cursor: input.cursor,
      limit: FRIEND_PAGE_SIZE + 1,
      sort,
    });
    const hasNextPage = records.length > FRIEND_PAGE_SIZE;
    const visibleRecords = records.slice(0, FRIEND_PAGE_SIZE);
    const lastRecord = visibleRecords.at(-1);

    return {
      friends: visibleRecords.map(toFriendResult),
      nextCursor:
        hasNextPage && lastRecord
          ? {
              sort,
              value: {
                createdAt: lastRecord.addedAt,
                id: lastRecord.friendshipId,
              },
            }
          : null,
    };
  }
}
