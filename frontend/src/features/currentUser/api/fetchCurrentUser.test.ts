import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchCurrentUser } from './fetchCurrentUser';

function stubFetch(response: { ok: boolean; status?: number; body?: unknown }) {
  const mockFetch = vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status ?? 200,
    json: () => Promise.resolve(response.body),
  });
  vi.stubGlobal('fetch', mockFetch);
  return mockFetch;
}

const validUser = {
  id: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001',
  name: '山田 太郎',
  profileUrl: '/assets/profiles/human1.png',
  balance: 120000,
};

describe('fetchCurrentUser', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('GET /api/me を呼び、現在ユーザーを返す', async () => {
    const mockFetch = stubFetch({ ok: true, body: { user: validUser } });

    await expect(fetchCurrentUser()).resolves.toEqual(validUser);

    const requestedUrl = mockFetch.mock.calls[0]?.[0] as URL;
    expect(requestedUrl.pathname).toBe('/api/me');
  });

  it('HTTPエラーはステータス付きのエラーにする', async () => {
    stubFetch({ ok: false, status: 404 });

    await expect(fetchCurrentUser()).rejects.toThrow(
      'ユーザー情報の取得に失敗しました (HTTP 404)',
    );
  });

  it('userを含まないレスポンスは不正として扱う', async () => {
    stubFetch({ ok: true, body: {} });

    await expect(fetchCurrentUser()).rejects.toThrow('不正なレスポンス');
  });

  it('balanceが数値でないレスポンスは不正として扱う', async () => {
    stubFetch({
      ok: true,
      body: { user: { ...validUser, balance: '120000' } },
    });

    await expect(fetchCurrentUser()).rejects.toThrow('不正なレスポンス');
  });
});
