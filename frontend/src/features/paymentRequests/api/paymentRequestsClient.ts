import type { Counterparty } from '../../../types/user';
import type {
  PaymentRequest,
  PaymentRequestAction,
  PaymentRequestDirection,
  PaymentRequestPage,
  PaymentRequestStatus,
  RespondedPaymentRequest,
} from '../types';

// 未設定なら同一オリジン（Vite dev serverの /api プロキシ経由）を使う。
const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '';

const statuses: readonly PaymentRequestStatus[] = [
  'pending',
  'accepted',
  'rejected',
];

function invalidResponseError(): Error {
  return new Error('請求の取得に失敗しました（不正なレスポンス）');
}

function isCounterparty(value: unknown): value is Counterparty {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const counterparty = value as Record<string, unknown>;
  return (
    typeof counterparty.id === 'string' &&
    typeof counterparty.name === 'string' &&
    typeof counterparty.profileUrl === 'string'
  );
}

function isIsoDateTime(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(new Date(value).getTime());
}

function isPaymentRequest(value: unknown): value is PaymentRequest {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const request = value as Record<string, unknown>;
  return (
    typeof request.id === 'string' &&
    isCounterparty(request.counterparty) &&
    // amountはAPI仕様で正の整数（円）。
    typeof request.amount === 'number' &&
    Number.isSafeInteger(request.amount) &&
    request.amount > 0 &&
    statuses.some((status) => status === request.status) &&
    // 決着済みなら誰が終わらせたかが必ず入る（V8で必須化）。pendingはnull。
    (request.endedByMe === null || typeof request.endedByMe === 'boolean') &&
    // 文字列であっても日付として解釈できなければ、表示時に空欄になるため弾く。
    isIsoDateTime(request.createdAt) &&
    (request.respondedAt === null || isIsoDateTime(request.respondedAt))
  );
}

/** 外部入力であるレスポンスを実行時に検証する（型を盲信しない）。 */
function parsePaymentRequestsResponse(data: unknown): PaymentRequestPage {
  if (typeof data !== 'object' || data === null) {
    throw invalidResponseError();
  }
  const body = data as Record<string, unknown>;

  const rawRequests = body.requests;
  if (!Array.isArray(rawRequests)) {
    throw invalidResponseError();
  }
  const requests: PaymentRequest[] = [];
  for (const item of rawRequests as unknown[]) {
    if (!isPaymentRequest(item)) {
      throw invalidResponseError();
    }
    requests.push(item);
  }

  const pageInfo = body.pageInfo;
  if (typeof pageInfo !== 'object' || pageInfo === null) {
    throw invalidResponseError();
  }
  const nextCursor = (pageInfo as Record<string, unknown>).nextCursor;
  if (nextCursor !== null && typeof nextCursor !== 'string') {
    throw invalidResponseError();
  }

  // hasNextPageはnextCursorの有無から判定できるため、画面側へは持ち出さない。
  return { requests, nextCursor };
}

interface FetchPaymentRequestsInput {
  direction: PaymentRequestDirection;
  /** 省略すると決着済みも含めた全件。ホーム画面はpendingだけを出す。 */
  status?: PaymentRequestStatus;
  cursor?: string | null;
}

function buildUrl({ direction, status, cursor }: FetchPaymentRequestsInput) {
  const base = API_BASE_URL || window.location.origin;
  const url = new URL('/api/payment-requests', base);
  url.searchParams.set('direction', direction);
  if (status !== undefined) {
    url.searchParams.set('status', status);
  }
  if (cursor) {
    url.searchParams.set('cursor', cursor);
  }
  return url;
}

/**
 * 請求を1ページ分（20件）取得する（Issue #70）。
 * 対象ユーザーはserver側のログイン中ユーザーから決まるため、URLやクエリで指定しない
 * （他人の請求を取得させないため）。
 * 並び順とページングはバックエンドの責務。追加ページは呼び出し側がnextCursorで取得する。
 */
export async function fetchPaymentRequests(
  input: FetchPaymentRequestsInput,
  signal?: AbortSignal,
): Promise<PaymentRequestPage> {
  const response = await fetch(buildUrl(input), { signal });

  if (!response.ok) {
    throw new Error(`請求の取得に失敗しました (HTTP ${response.status})`);
  }

  const data: unknown = await response.json();
  return parsePaymentRequestsResponse(data);
}

function readRequestField(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) {
    throw invalidResponseError();
  }
  return (data as Record<string, unknown>).request;
}

/**
 * 請求を1件取得する（Issue #61）。当事者でなければnullを返す。
 *
 * 一覧を読み込んだ時刻と行をタップする時刻の間に状態が変わりうるため、確認画面を
 * 開いた時点で取り直す。一覧APIで代用しないのは、20件ずつのページングでは
 * 古い請求へ到達できないため。
 *
 * 当事者でない場合もserverは404を返す。存在するが読めない状態と存在しない状態を
 * 区別しないことで、他人の請求IDを当てられても存在を確認できないようにしている。
 * 画面としてはどちらも「見つからない」なので、まとめてnullにする。
 */
export async function fetchPaymentRequest(
  id: string,
  signal?: AbortSignal,
): Promise<PaymentRequest | null> {
  const base = API_BASE_URL || window.location.origin;
  const response = await fetch(
    new URL(`/api/payment-requests/${encodeURIComponent(id)}`, base),
    { signal },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`請求の取得に失敗しました (HTTP ${response.status})`);
  }

  const request: unknown = readRequestField(await response.json());
  if (!isPaymentRequest(request)) {
    throw invalidResponseError();
  }
  return request;
}

/** エラーレスポンスからcodeを取り出す。形が違えばnull。 */
function readErrorCode(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) {
    return null;
  }
  const error = (data as Record<string, unknown>).error;
  if (typeof error !== 'object' || error === null) {
    return null;
  }
  const code = (error as Record<string, unknown>).code;
  return typeof code === 'string' ? code : null;
}

// 失敗の理由によって利用者の次の行動が変わるため、codeごとに文言を分ける。
const RESPOND_MESSAGES: Record<string, string> = {
  PAYMENT_REQUEST_NOT_FOUND: 'この請求は見つかりませんでした',
  PAYMENT_REQUEST_FORBIDDEN: 'この請求を操作する権限がありません',
  // 画面の制御だけでは防げない。別端末での処理や、一覧が古かった場合に起きる。
  PAYMENT_REQUEST_ALREADY_RESPONDED: 'この請求はすでに処理されています',
  INSUFFICIENT_BALANCE: '残高が足りません',
};

function isRespondedPaymentRequest(
  value: unknown,
): value is RespondedPaymentRequest {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const request = value as Record<string, unknown>;
  return (
    typeof request.id === 'string' &&
    typeof request.amount === 'number' &&
    Number.isSafeInteger(request.amount) &&
    request.amount > 0 &&
    // 決着した結果しか返らないため、pendingは想定外として弾く。
    (request.status === 'accepted' || request.status === 'rejected') &&
    isIsoDateTime(request.respondedAt)
  );
}

/**
 * 請求を承認・拒否・取り消しする（Issue #71）。
 *
 * 操作ごとにエンドポイントが分かれている。拒否も取り消しもDB上はrejectedになるが、
 * 実行できる人が逆（rejectは被請求者、cancelは請求者）で、誰が終わらせたかも
 * 記録されるため、状態ではなく操作で送る。
 *
 * 承認のレスポンスには更新後の残高も入るが、受け取らない。完了表示は送金フローと
 * 同じく残高を出さず、ホームへ戻った時点でGET /api/meが取り直すため。
 *
 * 同じ操作の再送は409ではなく200になる（server側で冪等にしてある）。COMMITは
 * 済んだのに応答が届かなかった場合に、再送すれば正しい結果へ収束させるため。
 */
export async function respondToPaymentRequest(
  id: string,
  action: PaymentRequestAction,
  signal?: AbortSignal,
): Promise<RespondedPaymentRequest> {
  const base = API_BASE_URL || window.location.origin;
  const response = await fetch(
    new URL(`/api/payment-requests/${encodeURIComponent(id)}/${action}`, base),
    { method: 'POST', signal },
  );

  if (!response.ok) {
    const code = readErrorCode(await response.json().catch(() => null));
    throw new Error(
      (code === null ? undefined : RESPOND_MESSAGES[code]) ??
        `請求の処理に失敗しました (HTTP ${response.status})`,
    );
  }

  const request: unknown = readRequestField(await response.json());
  if (!isRespondedPaymentRequest(request)) {
    throw invalidResponseError();
  }
  return request;
}
