import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { sendTransfer } from './transferClient';

const PARAMS = {
  senderId: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001',
  recipientId: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf002',
  amount: 1500,
  idempotencyKey: 'idem-key-123',
};

describe('sendTransfer', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('Idempotency-Keyヘッダと本文を付けて /api/transfers へPOSTする', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 201 }));

    await sendTransfer(PARAMS);

    expect(fetchMock).toHaveBeenCalledWith('/api/transfers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'idem-key-123',
      },
      // idempotencyKey はヘッダ。本文には含めない。
      body: JSON.stringify({
        senderId: PARAMS.senderId,
        recipientId: PARAMS.recipientId,
        amount: PARAMS.amount,
      }),
    });
  });

  it('2xxレスポンスなら解決する', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 201 }));

    await expect(sendTransfer(PARAMS)).resolves.toBeUndefined();
  });

  it.each([400, 409, 422, 500])(
    '%s レスポンスなら status を含むエラーでthrowする',
    async (status) => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status }));

      await expect(sendTransfer(PARAMS)).rejects.toThrow(String(status));
    },
  );

  it('fetch自体が失敗したら例外を伝播する', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network down'));

    await expect(sendTransfer(PARAMS)).rejects.toThrow('network down');
  });
});
