import { describe, expect, it, vi } from 'vitest';

import { CurrentUserNotFoundError } from '../errors/currentUserNotFoundError.js';
import { createUserRecipientRecords } from '../../test/factories/userRecipientFactory.js';
import { createUserRecipientRepository } from '../../test/factories/userRecipientRepositoryFactory.js';
import { ListUserRecipients } from './listUserRecipients.js';

const CURRENT_USER_ID = '11111111-1111-4111-8111-111111111111';

describe('ListUserRecipients', () => {
  it('20件を返し、21件目があれば次のカーソルを返す', async () => {
    const records = createUserRecipientRecords(21);
    const repository = createUserRecipientRepository({ recipients: records });
    const useCase = new ListUserRecipients(repository);

    const result = await useCase.execute({
      currentUserId: CURRENT_USER_ID,
      cursor: null,
    });

    expect(result.users).toHaveLength(20);
    expect(result.users[0]).toEqual({
      id: records[0]?.id,
      name: records[0]?.name,
      profileUrl: records[0]?.profileUrl,
    });
    expect(result.nextCursor).toEqual({
      createdAt: records[19]?.createdAt,
      id: records[19]?.id,
    });
    expect(repository.findRecipients).toHaveBeenCalledWith({
      currentUserId: CURRENT_USER_ID,
      cursor: null,
      limit: 21,
    });
  });

  it('20件以下なら次のカーソルを返さない', async () => {
    const repository = createUserRecipientRepository({
      recipients: createUserRecipientRecords(20),
    });
    const useCase = new ListUserRecipients(repository);

    const result = await useCase.execute({
      currentUserId: CURRENT_USER_ID,
      cursor: null,
    });

    expect(result.users).toHaveLength(20);
    expect(result.nextCursor).toBeNull();
  });

  it('現在のユーザーが存在しなければ候補を検索しない', async () => {
    const repository = createUserRecipientRepository({
      currentUserExists: false,
    });
    const useCase = new ListUserRecipients(repository);

    await expect(
      useCase.execute({ currentUserId: CURRENT_USER_ID, cursor: null }),
    ).rejects.toBeInstanceOf(CurrentUserNotFoundError);
    expect(repository.findRecipients).not.toHaveBeenCalled();
  });

  it('受け取ったカーソルをリポジトリへ渡す', async () => {
    const repository = createUserRecipientRepository();
    const useCase = new ListUserRecipients(repository);
    const cursor = {
      createdAt: '2026-08-04 12:00:20.000000',
      id: '00000000-0000-4000-8000-000000000020',
    };

    await useCase.execute({ currentUserId: CURRENT_USER_ID, cursor });

    expect(repository.findRecipients).toHaveBeenCalledWith({
      currentUserId: CURRENT_USER_ID,
      cursor,
      limit: 21,
    });
    expect(vi.mocked(repository.existsById)).toHaveBeenCalledWith(
      CURRENT_USER_ID,
    );
  });
});
