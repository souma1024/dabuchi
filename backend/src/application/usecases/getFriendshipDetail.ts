import { FriendshipNotFoundError } from '../errors/friendshipNotFoundError.js';
import type { CurrentUserRepository } from '../ports/currentUserRepository.js';
import type { FriendQueryRepository } from '../ports/friendQueryRepository.js';
import { toFriendResult, type FriendResult } from './friendQueryResult.js';
import { resolveCurrentUser } from './resolveCurrentUser.js';

export interface GetFriendshipDetailInput {
  currentUserPublicId: string;
  friendshipId: string;
}

export class GetFriendshipDetail {
  constructor(
    private readonly currentUserRepository: CurrentUserRepository,
    private readonly friendQueryRepository: FriendQueryRepository,
  ) {}

  async execute(input: GetFriendshipDetailInput): Promise<FriendResult> {
    const currentUser = await resolveCurrentUser(
      this.currentUserRepository,
      input.currentUserPublicId,
    );
    const record = await this.friendQueryRepository.findFriendshipDetail({
      currentUserId: currentUser.id,
      friendshipId: input.friendshipId,
    });

    if (!record || (record.blocksCurrentUser && !record.blockedByCurrentUser)) {
      throw new FriendshipNotFoundError();
    }

    return toFriendResult(record);
  }
}
