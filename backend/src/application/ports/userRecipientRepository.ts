import type { UserRecipientRecord } from '../../domain/userRecipient.js';

export interface RecipientCursor {
  createdAt: string;
  id: string;
}

export interface FindUserRecipientsInput {
  currentUserId: string;
  cursor: RecipientCursor | null;
  limit: number;
}

export interface UserRecipientRepository {
  existsById: (id: string) => Promise<boolean>;
  findRecipients: (
    input: FindUserRecipientsInput,
  ) => Promise<UserRecipientRecord[]>;
}
