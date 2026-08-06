export class FriendshipNotFoundError extends Error {
  constructor() {
    super('Friendship was not found.');
    this.name = 'FriendshipNotFoundError';
  }
}
