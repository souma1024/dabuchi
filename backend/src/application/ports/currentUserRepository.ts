import type { CurrentUser } from '../../domain/currentUser.js';

export interface CurrentUserRepository {
  findByUserId: (userId: string) => Promise<CurrentUser | null>;
}
