import { CurrentUserNotFoundError } from '../errors/currentUserNotFoundError.js';
import type { UserRecipient } from '../../domain/userRecipient.js';
import type {
  RecipientSort,
  RecipientCursor,
  UserRecipientRepository,
} from '../ports/userRecipientRepository.js';
import { DEFAULT_RECIPIENT_SORT as DEFAULT_SORT } from '../ports/userRecipientRepository.js';

const RECIPIENT_PAGE_SIZE = 20;

export interface ListUserRecipientsInput {
  currentUserId: string;
  cursor: RecipientCursor | null;
  sort?: RecipientSort;
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
    const sort = input.sort ?? DEFAULT_SORT;
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
      sort,
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
          ? sort === 'name-asc'
            ? {
                sort,
                value: {
                  name: lastVisibleRecord.name,
                  id: lastVisibleRecord.id,
                },
              }
            : {
                sort,
                value: {
                  createdAt: lastVisibleRecord.createdAt,
                  id: lastVisibleRecord.id,
                },
              }
          : null,
    };
  }
}
