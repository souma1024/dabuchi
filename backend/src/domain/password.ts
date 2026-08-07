import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

// promisifyはオーバーロードのうち引数3つの形しか拾えないため、
// オプション付きの形を明示して包む。
const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

// scryptのコストパラメータ。Nを上げるほど総当たりに時間がかかる。
// Node標準のscryptを使うのは、パスワードハッシュのために依存を増やさないため。
const SCRYPT_COST = 16_384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const SALT_BYTES = 16;
const KEY_BYTES = 32;
// 保存形式。パラメータを一緒に持たせ、後から強度を上げても既存の値を検証できる。
const ALGORITHM = 'scrypt';

export class InvalidPasswordError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPasswordError';
  }
}

/** 保存できるパスワードかを検証する。前後の空白は落とさない（そのまま意味のある文字）。 */
export function assertUsablePassword(password: string): void {
  if ([...password].length < PASSWORD_MIN_LENGTH) {
    throw new InvalidPasswordError(
      `A password must contain at least ${PASSWORD_MIN_LENGTH} characters.`,
    );
  }

  if ([...password].length > PASSWORD_MAX_LENGTH) {
    throw new InvalidPasswordError(
      `A password must contain at most ${PASSWORD_MAX_LENGTH} characters.`,
    );
  }
}

/** パスワードを保存用の文字列へ変換する。毎回ソルトを作るため、同じ入力でも結果は変わる。 */
export async function hashPassword(password: string): Promise<string> {
  assertUsablePassword(password);

  const salt = randomBytes(SALT_BYTES);
  const key = await deriveKey(password, salt);

  return [
    ALGORITHM,
    SCRYPT_COST,
    SCRYPT_BLOCK_SIZE,
    SCRYPT_PARALLELIZATION,
    salt.toString('base64'),
    key.toString('base64'),
  ].join('$');
}

/**
 * 保存済みの値と入力パスワードが一致するかを判定する。
 * 比較は時間差で内容を推測されないようtimingSafeEqualで行う。
 * 保存形式が壊れている場合も、例外にせずfalseとして扱う（ログイン失敗と同じ扱い）。
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const parsed = parseStoredHash(storedHash);

  if (!parsed) {
    return false;
  }

  const key = await deriveKey(password, parsed.salt, parsed);

  return key.length === parsed.key.length && timingSafeEqual(key, parsed.key);
}

interface ScryptParameters {
  cost: number;
  blockSize: number;
  parallelization: number;
}

async function deriveKey(
  password: string,
  salt: Buffer,
  parameters: ScryptParameters = {
    cost: SCRYPT_COST,
    blockSize: SCRYPT_BLOCK_SIZE,
    parallelization: SCRYPT_PARALLELIZATION,
  },
): Promise<Buffer> {
  return await scryptAsync(password, salt, KEY_BYTES, {
    N: parameters.cost,
    r: parameters.blockSize,
    p: parameters.parallelization,
    // Nを上げるとNode既定のメモリ上限を超えるため、パラメータに合わせて広げる。
    maxmem: 256 * parameters.cost * parameters.blockSize,
  });
}

function parseStoredHash(
  storedHash: string,
): (ScryptParameters & { salt: Buffer; key: Buffer }) | null {
  const [algorithm, cost, blockSize, parallelization, salt, key] =
    storedHash.split('$');

  if (
    algorithm !== ALGORITHM ||
    !cost ||
    !blockSize ||
    !parallelization ||
    !salt ||
    !key
  ) {
    return null;
  }

  const parsed = {
    cost: Number(cost),
    blockSize: Number(blockSize),
    parallelization: Number(parallelization),
    salt: Buffer.from(salt, 'base64'),
    key: Buffer.from(key, 'base64'),
  };

  if (
    !Number.isInteger(parsed.cost) ||
    !Number.isInteger(parsed.blockSize) ||
    !Number.isInteger(parsed.parallelization) ||
    parsed.salt.length === 0 ||
    parsed.key.length === 0
  ) {
    return null;
  }

  return parsed;
}
