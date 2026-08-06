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
