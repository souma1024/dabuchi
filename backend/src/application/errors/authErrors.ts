export class InvalidCredentialsError extends Error {
  constructor() {
    // どちらが違うかを伝えない。存在するuser_idを探る手がかりを与えないため。
    super('The user id or password is incorrect.');
    this.name = 'InvalidCredentialsError';
  }
}

export class UserIdAlreadyTakenError extends Error {
  constructor() {
    super('The user id is already taken.');
    this.name = 'UserIdAlreadyTakenError';
  }
}

export class InvalidSignUpError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidSignUpError';
  }
}

export class NotAuthenticatedError extends Error {
  constructor() {
    super('Authentication is required.');
    this.name = 'NotAuthenticatedError';
  }
}
