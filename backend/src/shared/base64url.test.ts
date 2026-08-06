import { describe, expect, it } from 'vitest';

import { decodeBase64Url } from './base64url.js';

const PLAIN_TEXT = '{"createdAt":"2026-08-04 12:00:20.000000"}';
const ENCODED = Buffer.from(PLAIN_TEXT, 'utf8').toString('base64url');

describe('decodeBase64Url', () => {
  it('base64urlをUTF-8へ復号する', () => {
    expect(decodeBase64Url(ENCODED)).toBe(PLAIN_TEXT);
  });

  it('日本語を含む文字列を往復できる', () => {
    const text = '佐藤 花子';

    expect(
      decodeBase64Url(Buffer.from(text, 'utf8').toString('base64url')),
    ).toBe(text);
  });

  it.each([
    // Buffer.from(..., 'base64url') はこれらを読み飛ばして復号に成功してしまう。
    ['末尾に非base64url文字がある', `${ENCODED}!`],
    [
      '途中に非base64url文字がある',
      `${ENCODED.slice(0, 4)}!${ENCODED.slice(4)}`,
    ],
    ['base64の+を含む', `${ENCODED}+`],
    ['base64の/を含む', `${ENCODED}/`],
    ['padding付き', `${ENCODED}==`],
    ['空文字', ''],
    ['空白を含む', `${ENCODED} `],
  ])('正規形でないbase64urlを拒否する: %s', (_name, value) => {
    expect(decodeBase64Url(value)).toBeNull();
  });
});
