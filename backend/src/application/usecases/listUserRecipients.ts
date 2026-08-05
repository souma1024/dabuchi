import { CurrentUserNotFoundError } from '../errors/currentUserNotFoundError.js';
import type { UserRecipient } from '../../domain/userRecipient.js';
import type {
  RecipientCursor,
  UserRecipientRepository,
} from '../ports/userRecipientRepository.js';

const RECIPIENT_PAGE_SIZE = 20;

export interface ListUserRecipientsInput {
  currentUserId: string;
  cursor: RecipientCursor | null;
}

export interface ListUserRecipientsResult {
  users: UserRecipient[];
  nextCursor: RecipientCursor | null;
}

export class ListUserRecipients {
  constructor(private readonly repository: UserRecipientRepository) {}

  async execute(
    input: ListUserRecipientsInput,
  ): Promise<ListUserRecipientsResult> {
    const currentUserExists = await this.repository.existsById(
      input.currentUserId,
    );

    if (!currentUserExists) {
      throw new CurrentUserNotFoundError();
    }

    const records = await this.repository.findRecipients({
      currentUserId: input.currentUserId,
      cursor: input.cursor,
      limit: RECIPIENT_PAGE_SIZE + 1,
    });
    const hasNextPage = records.length > RECIPIENT_PAGE_SIZE;
    const visibleRecords = records.slice(0, RECIPIENT_PAGE_SIZE);
    const lastVisibleRecord = visibleRecords.at(-1);

    return {
      users: visibleRecords.map(({ id, name, profileUrl }) => ({
        id,
        name,
        profileUrl,
      })),
      nextCursor:
        hasNextPage && lastVisibleRecord
          ? { createdAt: lastVisibleRecord.createdAt, id: lastVisibleRecord.id }
          : null,
    };
  }
}
