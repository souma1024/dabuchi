import { assertUsersAreDistinct } from '../../domain/userBlock.js';
import type { CurrentUserRepository } from '../ports/currentUserRepository.js';
import type { FriendCommandRepository } from '../ports/friendCommandRepository.js';
import { resolveWritableFriendship } from './resolveWritableFriendship.js';

export interface BlockFriendInput {
  currentUserPublicId: string;
  friendshipId: string;
}

export interface BlockFriendResult {
  friendshipId: string;
  blocked: true;
}

export class BlockFriend {
  constructor(
    private readonly currentUserRepository: CurrentUserRepository,
    private readonly friendCommandRepository: FriendCommandRepository,
  ) {}

  async execute(input: BlockFriendInput): Promise<BlockFriendResult> {
    const { currentUser, friendship } = await resolveWritableFriendship(
      this.currentUserRepository,
      this.friendCommandRepository,
      input.currentUserPublicId,
      input.friendshipId,
    );
    assertUsersAreDistinct(currentUser.id, friendship.friendId);

    await this.friendCommandRepository.blockUser({
      blockerId: currentUser.id,
      blockedUserId: friendship.friendId,
    });

    return { friendshipId: friendship.friendshipId, blocked: true };
  }
}
