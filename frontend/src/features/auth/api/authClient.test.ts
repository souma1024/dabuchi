import { describe, expect, it, vi } from 'vitest';

import { AuthApiError, logIn, logOut, signUp } from './authClient';

function stubFetch(response: { ok: boolean; status?: number; body?: unknown }) {
  const mockFetch = vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status ?? 200,
    json: () => Promise.resolve(response.body),
  });
  vi.stubGlobal('fetch', mockFetch);
  return mockFetch;
}

describe('logIn', () => {
  it('user_idとパスワードを送る', async () => {
    const mockFetch = stubFetch({ ok: true, body: { authenticated: true } });

    await logIn('friend-001', 'dabuchi-dev');

    const [url, init] = mockFetch.mock.calls[0] as [URL, RequestInit];
    expect(url.pathname).toBe('/api/auth/login');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(
      JSON.stringify({ userId: 'friend-001', password: 'dabuchi-dev' }),
    );
  });

  // tokenはHttpOnly Cookieで渡るため、clientでは保持しない。
  it('レスポンスbodyからtokenを読み出さない', async () => {
    stubFetch({ ok: true, body: { authenticated: true } });

    await expect(logIn('friend-001', 'dabuchi-dev')).resolves.toBeUndefined();
  });

  it.each([
    ['INVALID_CREDENTIALS', 'ユーザーIDかパスワードが違います'],
    ['INVALID_REQUEST', 'ユーザーIDとパスワードを入力してください'],
  ])('%sを利用者向けの文言にする', async (code, message) => {
    stubFetch({ ok: false, status: 401, body: { error: { code } } });

    await expect(logIn('friend-001', 'wrong')).rejects.toThrow(message);
  });

  it('知らないcodeはstatusを添えて失敗させる', async () => {
    stubFetch({ ok: false, status: 500, body: { error: { code: 'BOOM' } } });

    await expect(logIn('friend-001', 'dabuchi-dev')).rejects.toThrow(
      new AuthApiError('ログインに失敗しました (HTTP 500)', 'BOOM'),
    );
  });

  it('bodyがJSONでなくても失敗として扱う', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.reject(new Error('not json')),
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(logIn('friend-001', 'dabuchi-dev')).rejects.toThrow(
      'HTTP 502',
    );
  });
});

describe('signUp', () => {
  it('名前・user_id・パスワードを送る', async () => {
    const mockFetch = stubFetch({ ok: true, status: 201, body: {} });

    await signUp({
      userId: 'arai-taro',
      password: 'dabuchi-dev',
      name: '新井 太郎',
    });

    const [url, init] = mockFetch.mock.calls[0] as [URL, RequestInit];
    expect(url.pathname).toBe('/api/auth/signup');
    expect(init.body).toBe(
      JSON.stringify({
        userId: 'arai-taro',
        password: 'dabuchi-dev',
        name: '新井 太郎',
      }),
    );
  });

  it('使われているuser_idを利用者向けの文言にする', async () => {
    stubFetch({
      ok: false,
      status: 409,
      body: { error: { code: 'USER_ID_ALREADY_TAKEN' } },
    });

    await expect(
      signUp({ userId: 'friend-001', password: 'dabuchi-dev', name: '太郎' }),
    ).rejects.toThrow('そのユーザーIDはすでに使われています');
  });
});

describe('logOut', () => {
  it('POSTで送る', async () => {
    const mockFetch = stubFetch({ ok: true, status: 204 });

    await logOut();

    const [url, init] = mockFetch.mock.calls[0] as [URL, RequestInit];
    expect(url.pathname).toBe('/api/auth/logout');
    expect(init.method).toBe('POST');
  });

  it('失敗したらstatusを添えて失敗させる', async () => {
    stubFetch({ ok: false, status: 500 });

    await expect(logOut()).rejects.toThrow('HTTP 500');
  });
});
