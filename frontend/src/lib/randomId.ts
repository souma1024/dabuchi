/**
 * 衝突しない識別子（UUID v4形式）を作る。
 *
 * `crypto.randomUUID`はセキュアコンテキスト（HTTPSかlocalhost）でしか使えない。
 * 実機確認でLAN内のIPアドレス＋HTTPで開くと`undefined`になり、呼んだ時点で落ちる。
 * `crypto.getRandomValues`はその制約がないため、無い環境ではこちらで組み立てる。
 */
export function randomId(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const bytes = crypto.getRandomValues(new Uint8Array(16));

  // RFC 4122のversion(4)とvariant(10xx)を立てる。
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0'));

  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
}
