const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

/**
 * base64urlの文字列をUTF-8へ復号する。正規形でなければnullを返す。
 *
 * `Buffer.from(value, 'base64url')` は文字集合外の文字を黙って読み飛ばすため、
 * 正常なカーソルの末尾へ `!` を足しただけの値でも復号に成功してしまう。
 * 検証を素通りして200が返らないよう、文字集合を確かめたうえで、
 * 復号結果を再encodeした値が入力と一致することまで確認する。
 */
export function decodeBase64Url(value: string): string | null {
  if (!BASE64URL_PATTERN.test(value)) {
    return null;
  }

  const decoded = Buffer.from(value, 'base64url');

  // 文字集合を満たしていても、末尾のbit埋めが正規でない値は再encodeで一致しない。
  if (decoded.toString('base64url') !== value) {
    return null;
  }

  return decoded.toString('utf8');
}
