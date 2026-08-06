export const FRIENDSHIP_NOTE_MAX_LENGTH = 255;

export interface FriendshipNote {
  friendshipId: string;
  userId: string;
  message: string;
  createdAt: string;
  updatedAt: string;
}

export class InvalidFriendshipNoteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidFriendshipNoteError';
  }
}

export function normalizeFriendshipNote(message: string): string | null {
  const normalizedMessage = message.trim();

  if (normalizedMessage.length === 0) {
    return null;
  }

  if ([...normalizedMessage].length > FRIENDSHIP_NOTE_MAX_LENGTH) {
    throw new InvalidFriendshipNoteError(
      `A friendship note must contain at most ${FRIENDSHIP_NOTE_MAX_LENGTH} characters.`,
    );
  }

  return normalizedMessage;
}
