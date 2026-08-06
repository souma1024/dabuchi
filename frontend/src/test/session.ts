import { vi } from 'vitest';

import type { CurrentUser } from '../features/currentUser/types';

/** テスト用の現在ユーザー。 */
export const TEST_CURRENT_USER: CurrentUser = {
  id: '11111111-1111-4111-8111-111111111111',
  userId: 'friend-001',
  name: '山田 太郎',
  profileUrl: '/assets/profiles/human1.png',
  balance: 120_000,
};

/**
 * ログイン済みとして`GET /api/me`へ応答するfetchを差し込む。
 *
 * Appを描画するtestはルートガードを通る必要があり、どのtestでも同じ用意になるためまとめる。
 * /api/me以外はそのまま失敗させ、各testが必要な分だけ自分でmockする。
 */
export function stubAuthenticatedSession(
  user: CurrentUser = TEST_CURRENT_USER,
) {
  const fetchMock = vi.fn((input: Parameters<typeof fetch>[0]) => {
    const url =
      input instanceof URL
        ? input.pathname
        : typeof input === 'string'
          ? input
          : input.url;

    if (url.endsWith('/api/me')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ user }),
      } as Response);
    }

    return Promise.reject(new Error(`fetch is not stubbed for ${url}`));
  });

  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}

/** 未ログインとして`GET /api/me`が401を返すfetchを差し込む。 */
export function stubUnauthenticatedSession() {
  const fetchMock = vi.fn(() =>
    Promise.resolve({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: { code: 'NOT_AUTHENTICATED' } }),
    } as Response),
  );

  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}
