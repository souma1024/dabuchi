import {
  normalizeFriendshipNote,
  type FriendshipNote,
} from '../../domain/friendshipNote.js';
import { FriendshipNoteNotFoundError } from '../errors/friendCommandErrors.js';
import type { CurrentUserRepository } from '../ports/currentUserRepository.js';
import type { FriendCommandRepository } from '../ports/friendCommandRepository.js';
import { resolveWritableFriendship } from './resolveWritableFriendship.js';

export interface UpdateFriendshipNoteInput {
  currentUserPublicId: string;
  friendshipId: string;
  message: string;
}

export class UpdateFriendshipNote {
  constructor(
    private readonly currentUserRepository: CurrentUserRepository,
    private readonly friendCommandRepository: FriendCommandRepository,
  ) {}

  async execute(
    input: UpdateFriendshipNoteInput,
  ): Promise<FriendshipNote | null> {
    const message = normalizeFriendshipNote(input.message);
    const { currentUser, friendship } = await resolveWritableFriendship(
      this.currentUserRepository,
      this.friendCommandRepository,
      input.currentUserPublicId,
      input.friendshipId,
    );
    const key = {
      friendshipId: friendship.friendshipId,
      userId: currentUser.id,
    };

    if (message === null) {
      await this.friendCommandRepository.deleteNote(key);
      return null;
    }

    if (friendship.note === null) {
      throw new FriendshipNoteNotFoundError();
    }

    const note = await this.friendCommandRepository.updateNote({
      ...key,
      message,
    });

    if (!note) {
      throw new FriendshipNoteNotFoundError();
    }

    return note;
  }
}
