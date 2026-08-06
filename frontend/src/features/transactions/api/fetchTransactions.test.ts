import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchTransactions } from './fetchTransactions';

const CURRENT_USER_ID = '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001';

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe('fetchTransactions', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('1ページ分を取得する', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        transactions: [
          {
            id: '1',
            counterparty: {
              id: 'uuid-1',
              name: '山田 太郎',
              profileUrl: '/assets/profiles/human1.png',
            },
            amount: 1200,
            direction: 'sent',
            createdAt: '2026-08-05T01:00:00.000Z',
          },
        ],
        pageInfo: { nextCursor: 'CURSOR_1', hasNextPage: true },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const page = await fetchTransactions(CURRENT_USER_ID);

    expect(page).toEqual({
      transactions: [
        {
          id: '1',
          counterparty: {
            id: 'uuid-1',
            name: '山田 太郎',
            profileUrl: '/assets/profiles/human1.png',
          },
          amount: 1200,
          direction: 'sent',
          createdAt: '2026-08-05T01:00:00.000Z',
        },
      ],
      nextCursor: 'CURSOR_1',
    });

    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toContain(`/api/users/${CURRENT_USER_ID}/transactions`);
    expect(url).toContain('sort=created-desc');
  });

  it('cursorとsortを渡すとクエリに付与する', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        transactions: [],
        pageInfo: { nextCursor: null, hasNextPage: false },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await fetchTransactions(CURRENT_USER_ID, 'CURSOR_1', 'created-asc');

    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toContain('cursor=CURSOR_1');
    expect(url).toContain('sort=created-asc');
  });
});
