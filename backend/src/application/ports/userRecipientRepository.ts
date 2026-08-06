import type { UserRecipientRecord } from '../../domain/userRecipient.js';

export type RecipientSort = 'created-asc' | 'created-desc' | 'name-asc';

export interface RecipientCreatedAtCursor {
  createdAt: string;
  id: string;
}

export interface RecipientNameCursor {
  name: string;
  id: string;
}

export type RecipientCursor =
  | {
      sort: 'created-asc' | 'created-desc';
      value: RecipientCreatedAtCursor;
    }
  | {
      sort: 'name-asc';
      value: RecipientNameCursor;
    };

export const DEFAULT_RECIPIENT_SORT: RecipientSort = 'created-asc';

export interface FindUserRecipientsInput {
  currentUserId: string;
  cursor: RecipientCursor | null;
  limit: number;
  sort: RecipientSort;
}

export interface UserRecipientRepository {
  existsById: (id: string) => Promise<boolean>;
  findRecipients: (
    input: FindUserRecipientsInput,
  ) => Promise<UserRecipientRecord[]>;
}
