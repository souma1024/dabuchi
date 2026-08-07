import type { Counterparty } from '../../../types/user';
import type {
  PaymentRequest,
  PaymentRequestDirection,
  PaymentRequestPage,
  PaymentRequestStatus,
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
