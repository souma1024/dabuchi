import { afterEach, describe, expect, it, vi } from 'vitest';

import { randomId } from './randomId';

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('randomId', () => {
  it('毎回違う値を返す', () => {
    const ids = new Set(Array.from({ length: 100 }, () => randomId()));

    expect(ids.size).toBe(100);
  });

  it('UUID v4の形式にする', () => {
    expect(randomId()).toMatch(UUID_V4);
  });

  // crypto.randomUUIDはHTTPSかlocalhostでしか使えない。
  // 実機確認でIPアドレス＋HTTPで開くと存在せず、そのまま呼ぶと落ちる。
  it('randomUUIDが無い環境でも作れる', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: globalThis.crypto.getRandomValues.bind(
        globalThis.crypto,
      ),
    });

    expect(randomId()).toMatch(UUID_V4);
  });

  it('randomUUIDがあればそれを使う', () => {
    const randomUUID = vi.fn(() => '11111111-1111-4111-8111-111111111111');
    vi.stubGlobal('crypto', {
      randomUUID,
      getRandomValues: globalThis.crypto.getRandomValues.bind(
        globalThis.crypto,
      ),
    });

    expect(randomId()).toBe('11111111-1111-4111-8111-111111111111');
    expect(randomUUID).toHaveBeenCalledOnce();
  });
});
