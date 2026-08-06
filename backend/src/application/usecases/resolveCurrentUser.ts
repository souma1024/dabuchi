import type { CurrentUser } from '../../domain/currentUser.js';
import { CurrentUserNotFoundError } from '../errors/currentUserNotFoundError.js';
import type { CurrentUserRepository } from '../ports/currentUserRepository.js';

export async function resolveCurrentUser(
  repository: CurrentUserRepository,
  currentUserPublicId: string,
): Promise<CurrentUser> {
  const currentUser = await repository.findByUserId(currentUserPublicId);

  if (!currentUser) {
    throw new CurrentUserNotFoundError();
  }

  return currentUser;
}
