import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchRecipients } from './fetchRecipients';

const CURRENT_USER_ID = '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001';

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe('fetchRecipients', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('1ページ分を取得し、profileUrlをimageUrlへ写して返す', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        users: [
          {
            id: 'uuid-1',
            name: '山田 太郎',
            profileUrl: '/assets/profiles/human1.png',
          },
        ],
        pageInfo: { nextCursor: 'CURSOR_1', hasNextPage: true },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const page = await fetchRecipients(CURRENT_USER_ID);

    expect(page).toEqual({
      recipients: [
        {
          id: 'uuid-1',
          name: '山田 太郎',
          imageUrl: '/assets/profiles/human1.png',
        },
      ],
      nextCursor: 'CURSOR_1',
    });

    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toContain(`/api/users/${CURRENT_USER_ID}/recipients`);
    expect(url).toContain('sort=created-asc');
    expect(url).not.toContain('cursor=');
  });

  it('cursorとsortを渡すとクエリに付与する', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        users: [],
        pageInfo: { nextCursor: null, hasNextPage: false },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await fetchRecipients(CURRENT_USER_ID, 'CURSOR_1', 'name-asc');

    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toContain('cursor=CURSOR_1');
    expect(url).toContain('sort=name-asc');
  });

  it('HTTPエラーならエラーを投げる', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );

    await expect(fetchRecipients(CURRENT_USER_ID)).rejects.toThrow('HTTP 500');
  });

  it('レスポンスの形が不正ならエラーを投げる', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ foo: 'bar' })),
    );

    await expect(fetchRecipients(CURRENT_USER_ID)).rejects.toThrow(
      '不正なレスポンス',
    );
  });

  it('usersの要素が型不正ならエラーを投げる', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          users: [{ id: 1, name: '山田', profileUrl: '/x.png' }],
          pageInfo: { nextCursor: null, hasNextPage: false },
        }),
      ),
    );

    await expect(fetchRecipients(CURRENT_USER_ID)).rejects.toThrow(
      '不正なレスポンス',
    );
  });
});
