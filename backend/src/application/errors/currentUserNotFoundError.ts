export class CurrentUserNotFoundError extends Error {
  constructor() {
    super('Current user was not found.');
    this.name = 'CurrentUserNotFoundError';
  }
}
