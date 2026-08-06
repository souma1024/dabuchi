import { createFriendshipPair } from '../../domain/friendship.js';
import type { FriendProfile } from '../../domain/friendship.js';
import { normalizeFriendshipNote } from '../../domain/friendshipNote.js';
import { mysqlDateTimeToIso } from '../../shared/mysqlDateTime.js';
import {
  FriendUserNotFoundError,
  FriendshipAlreadyExistsError,
  InvalidFriendUserIdError,
} from '../errors/friendCommandErrors.js';
import { CurrentUserNotFoundError } from '../errors/currentUserNotFoundError.js';
import type { CurrentUserRepository } from '../ports/currentUserRepository.js';
import type { FriendCommandRepository } from '../ports/friendCommandRepository.js';

const PUBLIC_USER_ID_MAX_LENGTH = 64;

export interface AddFriendInput {
  currentUserPublicId: string;
  friendUserId: string;
  note?: string | null;
}

export interface AddedFriendshipResult {
  friendshipId: string;
  friend: FriendProfile;
  addedBy: FriendProfile;
  addedAt: string;
  note: string | null;
}

export type FriendshipIdGenerator = () => string;

export class AddFriend {
  constructor(
    private readonly currentUserRepository: CurrentUserRepository,
    private readonly friendCommandRepository: FriendCommandRepository,
    private readonly generateId: FriendshipIdGenerator,
  ) {}

  async execute(input: AddFriendInput): Promise<AddedFriendshipResult> {
    const friendUserId = normalizePublicUserId(input.friendUserId);
    const initialNote =
      input.note === undefined || input.note === null
        ? null
        : normalizeFriendshipNote(input.note);
    const currentUser = await this.currentUserRepository.findByUserId(
      input.currentUserPublicId,
    );

    if (!currentUser) {
      throw new CurrentUserNotFoundError();
    }

    const friend =
      await this.friendCommandRepository.findUserByPublicId(friendUserId);

    if (!friend) {
      throw new FriendUserNotFoundError();
    }

    const pair = createFriendshipPair(currentUser.id, friend.id);

    if (await this.friendCommandRepository.friendshipExists(pair)) {
      throw new FriendshipAlreadyExistsError();
    }

    const savedFriendship = await this.friendCommandRepository.createFriendship(
      {
        id: this.generateId(),
        ...pair,
        addedById: currentUser.id,
        initialNote,
      },
    );

    if (!savedFriendship) {
      throw new FriendshipAlreadyExistsError();
    }

    return {
      friendshipId: savedFriendship.id,
      friend,
      addedBy: {
        id: currentUser.id,
        userId: input.currentUserPublicId,
        name: currentUser.name,
        profileUrl: currentUser.profileUrl,
      },
      addedAt: mysqlDateTimeToIso(savedFriendship.createdAt),
      note: initialNote,
    };
  }
}

function normalizePublicUserId(value: string): string {
  const normalizedValue = value.trim();

  if (
    normalizedValue.length === 0 ||
    [...normalizedValue].length > PUBLIC_USER_ID_MAX_LENGTH
  ) {
    throw new InvalidFriendUserIdError(
      `friendUserId must contain between 1 and ${PUBLIC_USER_ID_MAX_LENGTH} characters.`,
    );
  }

  return normalizedValue;
}
