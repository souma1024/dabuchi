import type { UserRecipientRecord } from '../../domain/userRecipient.js';

export function createUserRecipientRecord(
  sequence = 1,
  overrides: Partial<UserRecipientRecord> = {},
): UserRecipientRecord {
  const suffix = String(sequence).padStart(12, '0');
  const seconds = String(sequence % 60).padStart(2, '0');

  return {
    id: `00000000-0000-4000-8000-${suffix}`,
    name: `テストユーザー${sequence}`,
    profileUrl: `/assets/profiles/human${((sequence - 1) % 6) + 1}.png`,
    createdAt: `2026-08-04 12:00:${seconds}.000000`,
    ...overrides,
  };
}

export function createUserRecipientRecords(
  count: number,
): UserRecipientRecord[] {
  return Array.from({ length: count }, (_, index) =>
    createUserRecipientRecord(index + 1),
  );
}
