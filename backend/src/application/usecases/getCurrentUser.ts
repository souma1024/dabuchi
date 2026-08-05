import type { CurrentUser } from '../../domain/currentUser.js';
import { CurrentUserNotFoundError } from '../errors/currentUserNotFoundError.js';
import type { CurrentUserRepository } from '../ports/currentUserRepository.js';

export class GetCurrentUser {
  constructor(private readonly repository: CurrentUserRepository) {}

  async execute(userId: string): Promise<CurrentUser> {
    const user = await this.repository.findByUserId(userId);

    if (!user) {
      throw new CurrentUserNotFoundError();
    }

    return user;
  }
}
