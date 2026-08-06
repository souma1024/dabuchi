import type { CurrentUser } from '../../domain/currentUser.js';

export function createCurrentUser(
  overrides: Partial<CurrentUser> = {},
): CurrentUser {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    userId: 'friend-001',
    name: '山田 太郎',
    profileUrl: '/assets/profiles/human1.png',
    balance: 120_000,
    ...overrides,
  };
}
