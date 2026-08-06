import { afterEach, describe, expect, it, vi } from 'vitest';

import { addFriend, fetchFriends, FriendApiError } from './friendsClient';

const validFriend = {
  friendshipId: '7f000000-0000-4000-8000-000000000002',
  friend: {
    id: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf002',
    userId: 'friend-002',
    name: '佐藤 花子',
    profileUrl: '/assets/profiles/human2.png',
  },
  addedBy: {
    id: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001',
    userId: 'friend-001',
    name: '山田 太郎',
    profileUrl: '/assets/profiles/human1.png',
  },
  addedAt: '2026-08-06T09:00:00.000Z',
  note: null,
};

function stubFetch(response: { ok: boolean; status?: number; body?: unknown }) {
  const mockFetch = vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status ?? 200,
    json: () => Promise.resolve(response.body),
  });
  vi.stubGlobal('fetch', mockFetch);
  return mockFetch;
}

function pageBody(friends: unknown[], nextCursor: string | null = null) {
  return {
    friends,
    pageInfo: { nextCursor, hasNextPage: nextCursor !== null },
  };
}

describe('fetchFriends', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('現在ユーザーの友達を取得する', async () => {
    const mockFetch = stubFetch({
      ok: true,
      body: pageBody([validFriend], 'next-cursor'),
    });

    const page = await fetchFriends();

    expect(page).toEqual({ friends: [validFriend], nextCursor: 'next-cursor' });
    // 対象ユーザーはserver側で決まるため、URLにユーザーを含めない。
    const [url] = mockFetch.mock.calls[0] as [URL];
    expect(url.pathname).toBe('/api/friends');
    expect(url.searchParams.get('cursor')).toBeNull();
  });

  it('カーソルをクエリへ渡す', async () => {
    const mockFetch = stubFetch({ ok: true, body: pageBody([]) });

    await fetchFriends('CURSOR_1');

    const [url] = mockFetch.mock.calls[0] as [URL];
    expect(url.searchParams.get('cursor')).toBe('CURSOR_1');
  });

  it('HTTPエラーはstatus付きで失敗させる', async () => {
    stubFetch({ ok: false, status: 500 });

    await expect(fetchFriends()).rejects.toThrow('HTTP 500');
  });

  it.each([
    { note: '不正な形' as unknown, body: { friends: 'not-an-array' } },
    {
      note: '必須項目が欠けた友達',
      body: pageBody([{ ...validFriend, friend: { id: 'only-id' } }]),
    },
    {
      note: '日付として解釈できないaddedAt',
      body: pageBody([{ ...validFriend, addedAt: 'not-a-date' }]),
    },
  ])('レスポンスの形が違えば失敗させる: $note', async ({ body }) => {
    stubFetch({ ok: true, body });

    await expect(fetchFriends()).rejects.toThrow('不正なレスポンス');
  });
});

describe('addFriend', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('公開user_idを送り、追加した友達を返す', async () => {
    const mockFetch = stubFetch({
      ok: true,
      status: 201,
      body: { friendship: validFriend },
    });

    await expect(addFriend('friend-002')).resolves.toEqual(validFriend);

    const [url, init] = mockFetch.mock.calls[0] as [URL, RequestInit];
    expect(url.pathname).toBe('/api/friends');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ friendUserId: 'friend-002' }));
  });

  // 失敗理由は利用者の入力次第で変わるため、codeごとに次の行動が分かる文言にする。
  it.each([
    { code: 'FRIEND_USER_NOT_FOUND', message: 'ユーザーが見つかりません' },
    { code: 'FRIENDSHIP_ALREADY_EXISTS', message: 'すでに友達です' },
    { code: 'INVALID_REQUEST', message: 'ユーザーIDの形式が正しくありません' },
  ])('$codeを利用者向けの文言にする', async ({ code, message }) => {
    stubFetch({
      ok: false,
      status: 404,
      body: { error: { code, message: 'internal message' } },
    });

    await expect(addFriend('friend-999')).rejects.toThrow(message);
  });

  it('知らないcodeはstatusを添えて失敗させる', async () => {
    stubFetch({
      ok: false,
      status: 500,
      body: { error: { code: 'INTERNAL_SERVER_ERROR' } },
    });

    await expect(addFriend('friend-002')).rejects.toThrow(
      new FriendApiError(
        '友達の追加に失敗しました (HTTP 500)',
        'INTERNAL_SERVER_ERROR',
      ),
    );
  });
});
