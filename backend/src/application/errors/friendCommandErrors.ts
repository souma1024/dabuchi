export class InvalidFriendUserIdError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidFriendUserIdError';
  }
}

export class FriendUserNotFoundError extends Error {
  constructor() {
    super('Friend user was not found.');
    this.name = 'FriendUserNotFoundError';
  }
}

export class FriendshipAlreadyExistsError extends Error {
  constructor() {
    super('Friendship already exists.');
    this.name = 'FriendshipAlreadyExistsError';
  }
}

export class InvalidFriendshipIdError extends Error {
  constructor() {
    super('friendshipId must be a UUID.');
    this.name = 'InvalidFriendshipIdError';
  }
}

export { FriendshipNotFoundError } from './friendshipNotFoundError.js';

export class FriendshipNoteAlreadyExistsError extends Error {
  constructor() {
    super('Friendship note already exists.');
    this.name = 'FriendshipNoteAlreadyExistsError';
  }
}
