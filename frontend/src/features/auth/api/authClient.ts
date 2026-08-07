// 未設定なら同一オリジン（Vite dev serverの /api プロキシ経由）を使う。
const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '';

/** APIのエラーレスポンスに含まれるcode。画面側の出し分けに使う。 */
export class AuthApiError extends Error {
  constructor(
    message: string,
    readonly code: string | null,
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}

/** エラーレスポンスからcodeを取り出す。形が違えばnull。 */
function readErrorCode(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) {
    return null;
  }
  const error = (data as { error?: unknown }).error;
  if (typeof error !== 'object' || error === null) {
    return null;
  }
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

// 失敗理由は利用者の入力次第で変わるため、codeごとに次の行動が分かる文言にする。
const LOG_IN_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'ユーザーIDかパスワードが違います',
  INVALID_REQUEST: 'ユーザーIDとパスワードを入力してください',
};

const SIGN_UP_MESSAGES: Record<string, string> = {
  USER_ID_ALREADY_TAKEN: 'そのユーザーIDはすでに使われています',
  INVALID_REQUEST:
    'ユーザーIDは英数字・ハイフン・アンダースコア、パスワードは8文字以上にしてください',
};

function buildUrl(path: string): URL {
  return new URL(path, API_BASE_URL || window.location.origin);
}

async function post(
  path: string,
  body: unknown,
  messages: Record<string, string>,
  fallback: string,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(buildUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (response.ok) {
    return;
  }

  // 失敗時のbodyはJSONとは限らないため、読めなくても落とさない。
  const data: unknown = await response.json().catch(() => null);
  const code = readErrorCode(data);

  throw new AuthApiError(
    (code !== null ? messages[code] : undefined) ??
      `${fallback} (HTTP ${String(response.status)})`,
    code,
  );
}

/**
 * ログインする。成功するとサーバーがセッションCookieを発行する。
 * tokenはHttpOnly Cookieで渡るため、clientでは保持しない。
 */
export async function logIn(
  userId: string,
  password: string,
  signal?: AbortSignal,
): Promise<void> {
  await post(
    '/api/auth/login',
    { userId, password },
    LOG_IN_MESSAGES,
    'ログインに失敗しました',
    signal,
  );
}

/** 新規登録する。成功するとそのままログイン状態になる。 */
export async function signUp(
  input: { userId: string; password: string; name: string },
  signal?: AbortSignal,
): Promise<void> {
  await post(
    '/api/auth/signup',
    input,
    SIGN_UP_MESSAGES,
    '登録に失敗しました',
    signal,
  );
}

/** ログアウトする。セッションが無くても成功する。 */
export async function logOut(signal?: AbortSignal): Promise<void> {
  const response = await fetch(buildUrl('/api/auth/logout'), {
    method: 'POST',
    signal,
  });

  if (!response.ok) {
    throw new Error(
      `ログアウトに失敗しました (HTTP ${String(response.status)})`,
    );
  }
}
