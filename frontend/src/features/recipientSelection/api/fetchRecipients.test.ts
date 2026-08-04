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

  it('カーソルを辿って全ページを取得し、profileUrlをimageUrlへ写す', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
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
      )
      .mockResolvedValueOnce(
        jsonResponse({
          users: [
            {
              id: 'uuid-2',
              name: '佐藤 花子',
              profileUrl: '/assets/profiles/human2.png',
            },
          ],
          pageInfo: { nextCursor: null, hasNextPage: false },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchRecipients(CURRENT_USER_ID);

    expect(result).toEqual([
      {
        id: 'uuid-1',
        name: '山田 太郎',
        imageUrl: '/assets/profiles/human1.png',
      },
      {
        id: 'uuid-2',
        name: '佐藤 花子',
        imageUrl: '/assets/profiles/human2.png',
      },
    ]);

    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls).toHaveLength(2);
    expect(urls[0]).toContain(`/api/users/${CURRENT_USER_ID}/recipients`);
    expect(urls[0]).not.toContain('cursor=');
    expect(urls[1]).toContain('cursor=CURSOR_1');
  });

  it('レスポンスが失敗ならエラーを投げる', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );

    await expect(fetchRecipients(CURRENT_USER_ID)).rejects.toThrow('HTTP 500');
  });
});
