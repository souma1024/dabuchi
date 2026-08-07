import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchTransactions } from './transactionsClient';

const validTransaction = {
  id: '1024',
  counterparty: {
    id: '0198fb84-b222-7abc-8def-0123456789ab',
    name: '山田 太郎',
    profileUrl: '/assets/profiles/human1.png',
  },
  amount: 1200,
  direction: 'sent',
  createdAt: '2026-08-05T01:00:00.000Z',
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

function pageBody(
  transactions: unknown[],
  nextCursor: string | null = null,
): unknown {
  return {
    transactions,
    pageInfo: { nextCursor, hasNextPage: nextCursor !== null },
  };
}

describe('fetchTransactions', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('現在ユーザーの取引履歴を取得する', async () => {
    const mockFetch = stubFetch({
      ok: true,
      body: pageBody([validTransaction], 'next-cursor'),
    });

    await expect(fetchTransactions()).resolves.toEqual({
      transactions: [validTransaction],
      nextCursor: 'next-cursor',
    });

    const requestedUrl = mockFetch.mock.calls[0]?.[0] as URL;
    // URLでユーザーを指定しない（server側のログインユーザーを対象にする）。
    expect(requestedUrl.pathname).toBe('/api/transactions');
    expect(requestedUrl.searchParams.get('cursor')).toBeNull();
    expect(requestedUrl.searchParams.get('sort')).toBe('created-desc');
  });

  it('カーソルを指定すると次ページとしてクエリに載せる', async () => {
    const mockFetch = stubFetch({ ok: true, body: pageBody([]) });

    await fetchTransactions('eyJjcmVhdGVkQXQi');

    const requestedUrl = mockFetch.mock.calls[0]?.[0] as URL;
    expect(requestedUrl.searchParams.get('cursor')).toBe('eyJjcmVhdGVkQXQi');
    expect(requestedUrl.searchParams.get('sort')).toBe('created-desc');
  });

  it('sortを指定するとクエリに載せる', async () => {
    const mockFetch = stubFetch({ ok: true, body: pageBody([]) });

    await fetchTransactions(null, 'created-asc');

    const requestedUrl = mockFetch.mock.calls[0]?.[0] as URL;
    expect(requestedUrl.searchParams.get('sort')).toBe('created-asc');
  });

  it('最終ページはnextCursorをnullで返す', async () => {
    stubFetch({ ok: true, body: pageBody([validTransaction], null) });

    await expect(fetchTransactions()).resolves.toMatchObject({
      nextCursor: null,
    });
  });

  it('取引が0件でも正常な結果として扱う', async () => {
    stubFetch({ ok: true, body: pageBody([]) });

    await expect(fetchTransactions()).resolves.toEqual({
      transactions: [],
      nextCursor: null,
    });
  });

  it.each([
    ['400', 400],
    ['404', 404],
    ['500', 500],
  ])('HTTP %s はステータス付きのエラーにする', async (_label, status) => {
    stubFetch({ ok: false, status });

    await expect(fetchTransactions()).rejects.toThrow(
      `取引履歴の取得に失敗しました (HTTP ${status})`,
    );
  });

  it.each([
    ['transactionsが配列でない', { transactions: {}, pageInfo: {} }],
    ['pageInfoが無い', { transactions: [] }],
    [
      'nextCursorが文字列でもnullでもない',
      { transactions: [], pageInfo: { nextCursor: 0 } },
    ],
  ])('%s レスポンスは不正として扱う', async (_label, body) => {
    stubFetch({ ok: true, body });

    await expect(fetchTransactions()).rejects.toThrow('不正なレスポンス');
  });

  it.each([
    ['idが数値', { ...validTransaction, id: 1024 }],
    ['counterpartyが無い', { ...validTransaction, counterparty: undefined }],
    ['amountが0', { ...validTransaction, amount: 0 }],
    ['amountが負数', { ...validTransaction, amount: -100 }],
    ['amountが小数', { ...validTransaction, amount: 10.5 }],
    ['directionが未知の値', { ...validTransaction, direction: 'unknown' }],
    ['createdAtが無い', { ...validTransaction, createdAt: undefined }],
    // 文字列でも日付として解釈できなければ、表示時に日時が空欄になってしまう。
    [
      'createdAtが日付として不正',
      { ...validTransaction, createdAt: 'not-a-date' },
    ],
    ['createdAtが空文字', { ...validTransaction, createdAt: '' }],
  ])('取引の%s なら不正として扱う', async (_label, transaction) => {
    stubFetch({ ok: true, body: pageBody([transaction]) });

    await expect(fetchTransactions()).rejects.toThrow('不正なレスポンス');
  });
});
