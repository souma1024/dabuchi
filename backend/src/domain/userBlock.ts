export interface UserBlock {
  blockerId: string;
  blockedUserId: string;
  createdAt: string;
}

export class InvalidUserBlockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidUserBlockError';
  }
}

export function assertUsersAreDistinct(
  blockerId: string,
  blockedUserId: string,
): void {
  if (blockerId.toLowerCase() === blockedUserId.toLowerCase()) {
    throw new InvalidUserBlockError('A user cannot block themselves.');
  }
}
