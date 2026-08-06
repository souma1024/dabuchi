import {
  InvalidFriendshipNoteError,
  normalizeFriendshipNote,
  type FriendshipNote,
} from '../../domain/friendshipNote.js';
import { FriendshipNoteAlreadyExistsError } from '../errors/friendCommandErrors.js';
import type { CurrentUserRepository } from '../ports/currentUserRepository.js';
import type { FriendCommandRepository } from '../ports/friendCommandRepository.js';
import { resolveWritableFriendship } from './resolveWritableFriendship.js';

export interface CreateFriendshipNoteInput {
  currentUserPublicId: string;
  friendshipId: string;
  message: string;
}

export class CreateFriendshipNote {
  constructor(
    private readonly currentUserRepository: CurrentUserRepository,
    private readonly friendCommandRepository: FriendCommandRepository,
  ) {}

  async execute(input: CreateFriendshipNoteInput): Promise<FriendshipNote> {
    const message = normalizeFriendshipNote(input.message);

    if (message === null) {
      throw new InvalidFriendshipNoteError(
        'A friendship note cannot be empty when created.',
      );
    }

    const { currentUser, friendship } = await resolveWritableFriendship(
      this.currentUserRepository,
      this.friendCommandRepository,
      input.currentUserPublicId,
      input.friendshipId,
    );

    if (friendship.note !== null) {
      throw new FriendshipNoteAlreadyExistsError();
    }

    const note = await this.friendCommandRepository.createNote({
      friendshipId: friendship.friendshipId,
      userId: currentUser.id,
      message,
    });

    if (!note) {
      throw new FriendshipNoteAlreadyExistsError();
    }

    return note;
  }
}
