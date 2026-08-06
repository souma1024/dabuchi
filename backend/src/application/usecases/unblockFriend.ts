import { assertUsersAreDistinct } from '../../domain/userBlock.js';
import type { CurrentUserRepository } from '../ports/currentUserRepository.js';
import type { FriendCommandRepository } from '../ports/friendCommandRepository.js';
import { resolveWritableFriendship } from './resolveWritableFriendship.js';

export interface UnblockFriendInput {
  currentUserPublicId: string;
  friendshipId: string;
}

export class UnblockFriend {
  constructor(
    private readonly currentUserRepository: CurrentUserRepository,
    private readonly friendCommandRepository: FriendCommandRepository,
  ) {}

  async execute(input: UnblockFriendInput): Promise<void> {
    const { currentUser, friendship } = await resolveWritableFriendship(
      this.currentUserRepository,
      this.friendCommandRepository,
      input.currentUserPublicId,
      input.friendshipId,
      { allowWhenBlockedByFriend: true },
    );
    assertUsersAreDistinct(currentUser.id, friendship.friendId);

    await this.friendCommandRepository.unblockUser({
      blockerId: currentUser.id,
      blockedUserId: friendship.friendId,
    });
  }
}
