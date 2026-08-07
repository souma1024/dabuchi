import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  fetchPaymentRequest,
  fetchPaymentRequests,
  respondToPaymentRequest,
} from './paymentRequestsClient';

const validRequest = {
  id: '7f000000-0000-4000-8000-000000000001',
  counterparty: {
    id: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf002',
    name: '佐藤 花子',
    profileUrl: '/assets/profiles/human2.png',
  },
  amount: 3000,
  status: 'pending',
  createdAt: '2026-08-03T01:00:00.000Z',
  respondedAt: null,
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

function requestedUrl(mockFetch: ReturnType<typeof stubFetch>): string {
  return String(mockFetch.mock.calls[0]?.[0]);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchPaymentRequests', () => {
  it('directionとstatusをクエリに載せる', async () => {
    const mockFetch = stubFetch({
      ok: true,
      body: { requests: [], pageInfo: { nextCursor: null } },
    });

    await fetchPaymentRequests({ direction: 'received', status: 'pending' });

    expect(requestedUrl(mockFetch)).toContain('direction=received');
    expect(requestedUrl(mockFetch)).toContain('status=pending');
  });

  // 型注釈だけでは、APIが想定外の値を返したときに描画側で崩れる。
  it('金額が0以下なら受け付けない', async () => {
    stubFetch({
      ok: true,
      body: {
        requests: [{ ...validRequest, amount: 0 }],
        pageInfo: { nextCursor: null },
      },
    });

    await expect(
      fetchPaymentRequests({ direction: 'received' }),
    ).rejects.toThrow('不正なレスポンス');
  });
});

describe('fetchPaymentRequest', () => {
  it('請求を1件返す', async () => {
    const mockFetch = stubFetch({ ok: true, body: { request: validRequest } });

    await expect(fetchPaymentRequest(validRequest.id)).resolves.toEqual(
      validRequest,
    );
    expect(requestedUrl(mockFetch)).toContain(
      `/api/payment-requests/${validRequest.id}`,
    );
  });

  // 当事者でない場合もserverは404を返す。他人の請求IDを当てられても存在を
  // 確認できないようにするため、画面からはどちらも「見つからない」で同じ。
  it('404はnullにする', async () => {
    stubFetch({ ok: false, status: 404 });

    await expect(fetchPaymentRequest(validRequest.id)).resolves.toBeNull();
  });

  it('404以外の失敗は投げる', async () => {
    stubFetch({ ok: false, status: 500 });

    await expect(fetchPaymentRequest(validRequest.id)).rejects.toThrow(
      'HTTP 500',
    );
  });
});

describe('respondToPaymentRequest', () => {
  const responded = {
    id: validRequest.id,
    amount: 3000,
    status: 'accepted',
    respondedAt: '2026-08-06T02:00:00.000Z',
  };

  // 拒否と取り消しはDB上どちらもrejectedになるため、操作ごとにURLが分かれている。
  it.each([
    ['accept', 'accept'],
    ['reject', 'reject'],
    ['cancel', 'cancel'],
  ] as const)('%sは対応するエンドポイントへPOSTする', async (action, path) => {
    const mockFetch = stubFetch({
      ok: true,
      body: { request: { ...responded, status: 'rejected' } },
    });

    await respondToPaymentRequest(validRequest.id, action);

    expect(requestedUrl(mockFetch)).toContain(
      `/api/payment-requests/${validRequest.id}/${path}`,
    );
    expect(mockFetch.mock.calls[0]?.[1]).toMatchObject({ method: 'POST' });
  });

  it('残高は返らないため受け取らない', async () => {
    stubFetch({ ok: true, body: { request: responded, balance: 117000 } });

    await expect(
      respondToPaymentRequest(validRequest.id, 'accept'),
    ).resolves.toEqual(responded);
  });

  // 失敗の理由によって利用者の次の行動が変わるため、codeごとに文言を分ける。
  it.each([
    ['PAYMENT_REQUEST_FORBIDDEN', 403, 'この請求を操作する権限がありません'],
    [
      'PAYMENT_REQUEST_ALREADY_RESPONDED',
      409,
      'この請求はすでに処理されています',
    ],
    ['INSUFFICIENT_BALANCE', 422, '残高が足りません'],
  ])('%sは専用の文言にする', async (code, status, message) => {
    stubFetch({ ok: false, status, body: { error: { code } } });

    await expect(
      respondToPaymentRequest(validRequest.id, 'accept'),
    ).rejects.toThrow(message);
  });

  it('知らないcodeはstatusを添えて伝える', async () => {
    stubFetch({ ok: false, status: 500, body: { error: { code: 'UNKNOWN' } } });

    await expect(
      respondToPaymentRequest(validRequest.id, 'accept'),
    ).rejects.toThrow('HTTP 500');
  });

  // 決着した結果しか返らないため、pendingが来たら想定外として扱う。
  it('pendingが返ったら受け付けない', async () => {
    stubFetch({
      ok: true,
      body: { request: { ...responded, status: 'pending' } },
    });

    await expect(
      respondToPaymentRequest(validRequest.id, 'accept'),
    ).rejects.toThrow('不正なレスポンス');
  });
});
