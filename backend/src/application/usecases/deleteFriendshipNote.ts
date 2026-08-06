import type { CurrentUserRepository } from '../ports/currentUserRepository.js';
import type { FriendCommandRepository } from '../ports/friendCommandRepository.js';
import { resolveWritableFriendship } from './resolveWritableFriendship.js';

export interface DeleteFriendshipNoteInput {
  currentUserPublicId: string;
  friendshipId: string;
}

export class DeleteFriendshipNote {
  constructor(
    private readonly currentUserRepository: CurrentUserRepository,
    private readonly friendCommandRepository: FriendCommandRepository,
  ) {}

  async execute(input: DeleteFriendshipNoteInput): Promise<void> {
    const { currentUser, friendship } = await resolveWritableFriendship(
      this.currentUserRepository,
      this.friendCommandRepository,
      input.currentUserPublicId,
      input.friendshipId,
    );

    await this.friendCommandRepository.deleteNote({
      friendshipId: friendship.friendshipId,
      userId: currentUser.id,
    });
  }
}
