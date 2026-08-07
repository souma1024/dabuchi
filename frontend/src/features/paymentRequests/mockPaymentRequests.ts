import type {
  Counterparty,
  PaymentRequest,
  PaymentRequestAction,
  PaymentRequestDirection,
  PaymentRequestPage,
  PaymentRequestStatus,
} from './types';

// 添字アクセスがundefinedにならないよう、先頭要素の存在を型で保証する。
type NonEmpty<T> = readonly [T, ...T[]];

// 開発用シード（database/seeds/development.sql）の氏名・画像に合わせている。
// 同名が並ぶと画面の確認がしにくいため、相手はモック件数と同数を用意して重複させない。
const counterparties: NonEmpty<Counterparty> = [
  {
    id: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf002',
    name: '佐藤 花子',
    profileUrl: '/assets/profiles/human2.png',
  },
  {
    id: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf003',
    name: '鈴木 一郎',
    profileUrl: '/assets/profiles/human3.png',
  },
  {
    id: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf004',
    name: '高橋 美咲',
    profileUrl: '/assets/profiles/human4.png',
  },
  {
    id: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf005',
    name: '田中 健太',
    profileUrl: '/assets/profiles/human5.png',
  },
  {
    id: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf006',
    name: '伊藤 結衣',
    profileUrl: '/assets/profiles/human6.png',
  },
  {
    id: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf007',
    name: '渡辺 翔太',
    profileUrl: '/assets/profiles/human1.png',
  },
  {
    id: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf008',
    name: '山本 葵',
    profileUrl: '/assets/profiles/human2.png',
  },
  {
    id: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf009',
    name: '中村 大輔',
    profileUrl: '/assets/profiles/human3.png',
  },
  {
    id: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf010',
    name: '小林 さくら',
    profileUrl: '/assets/profiles/human4.png',
  },
  {
    id: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf011',
    name: '加藤 遼',
    profileUrl: '/assets/profiles/human5.png',
  },
  {
    id: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf012',
    name: '吉田 愛',
    profileUrl: '/assets/profiles/human6.png',
  },
  {
    id: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf013',
    name: '山田 悠真',
    profileUrl: '/assets/profiles/human1.png',
  },
  {
    id: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf014',
    name: '佐々木 彩',
    profileUrl: '/assets/profiles/human2.png',
  },
  {
    id: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf015',
    name: '山口 直樹',
    profileUrl: '/assets/profiles/human3.png',
  },
  {
    id: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf016',
    name: '松本 琴音',
    profileUrl: '/assets/profiles/human4.png',
  },
  {
    id: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf017',
    name: '井上 陸',
    profileUrl: '/assets/profiles/human5.png',
  },
  {
    id: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf018',
    name: '木村 楓',
    profileUrl: '/assets/profiles/human6.png',
  },
  {
    id: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf019',
    name: '林 拓海',
    profileUrl: '/assets/profiles/human1.png',
  },
  {
    id: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf020',
    name: '斎藤 陽菜',
    profileUrl: '/assets/profiles/human2.png',
  },
  {
    id: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf021',
    name: '清水 海斗',
    profileUrl: '/assets/profiles/human3.png',
  },
  {
    id: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf022',
    name: '山崎 莉子',
    profileUrl: '/assets/profiles/human4.png',
  },
  {
    id: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf023',
    name: '森 蓮',
    profileUrl: '/assets/profiles/human5.png',
  },
  {
    id: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf024',
    name: '池田 美月',
    profileUrl: '/assets/profiles/human6.png',
  },
  {
    id: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf025',
    name: '橋本 蒼',
    profileUrl: '/assets/profiles/human1.png',
  },
  {
    id: '5e5a4a1e-3b42-4f47-8b1f-b77ef98bf026',
    name: '阿部 七海',
    profileUrl: '/assets/profiles/human2.png',
  },
];

const amounts: NonEmpty<number> = [
  3000, 1200, 500, 2400, 800, 4500, 1800, 320, 6000, 950,
];

const MOCK_COUNT = 25;

function createMockRequests(
  direction: PaymentRequestDirection,
  statuses: readonly PaymentRequestStatus[],
): PaymentRequest[] {
  return Array.from({ length: MOCK_COUNT }, (_, index) => {
    const counterparty =
      counterparties[index % counterparties.length] ?? counterparties[0];
    const amount = amounts[index % amounts.length] ?? amounts[0];
    const status = statuses[index % statuses.length] ?? 'pending';
    const day = 5 - Math.floor(index / 3);
    const jstHour = 20 - (index % 3) * 4;
    // APIはISO 8601のUTCを返す（Issue #70）。表示したいJSTから9時間引いて生成する。
    const createdAt = new Date(
      Date.UTC(2026, 7, day, jstHour - 9, 0),
    ).toISOString();

    return {
      id: `mock-${direction}-request-${String(index + 1).padStart(2, '0')}`,
      counterparty,
      amount,
      status,
      createdAt,
      // 応答済みのものだけ、請求の翌日に応答したことにする。
      respondedAt:
        status === 'pending'
          ? null
          : new Date(Date.UTC(2026, 7, day + 1, jstHour - 9, 0)).toISOString(),
    } satisfies PaymentRequest;
  });
}

/** 未払いの請求（自分が請求された側）。ホーム画面が使う。 */
export const mockReceivedPaymentRequests: PaymentRequest[] = createMockRequests(
  'received',
  ['pending'],
);

// 履歴は決着済みも含めて全状態を並べる。
const mockHistories: Record<PaymentRequestDirection, PaymentRequest[]> = {
  received: createMockRequests('received', [
    'pending',
    'accepted',
    'rejected',
    'pending',
    'accepted',
  ]),
  sent: createMockRequests('sent', [
    'pending',
    'rejected',
    'accepted',
    'accepted',
    'pending',
  ]),
};

// 実APIは20件固定で返す（Issue #70）。取得と表示の単位を分けず、そのまま並べる。
const PAGE_SIZE = 20;

function slicePage(
  source: PaymentRequest[],
  cursor: string | null,
): PaymentRequestPage {
  const start = cursor === null ? 0 : Number(cursor);
  const end = start + PAGE_SIZE;

  return {
    requests: source.slice(start, end),
    nextCursor: end < source.length ? String(end) : null,
  };
}

/**
 * モックの受けた請求（未払い）を1ページ分返す。ホーム画面用。
 * 実APIは GET /api/payment-requests?direction=received&status=pending（Issue #70）。
 * カーソルは次ページ先頭のindexを文字列にしただけの簡易版。
 */
export function fetchMockReceivedPaymentRequestPage(
  cursor: string | null = null,
): Promise<PaymentRequestPage> {
  return Promise.resolve(slicePage(mockReceivedPaymentRequests, cursor));
}

/**
 * モックの請求履歴を1ページ分返す。状態で絞らず、決着済みも含める。
 * 実APIは GET /api/payment-requests?direction=<direction>（Issue #70）。
 */
export function fetchMockPaymentRequestHistoryPage(
  direction: PaymentRequestDirection,
  cursor: string | null = null,
): Promise<PaymentRequestPage> {
  return Promise.resolve(slicePage(mockHistories[direction], cursor));
}

/**
 * モックの請求を1件返す。承認画面が開いた時点で最新を取り直す用途（Issue #61）。
 * 実APIは GET /api/payment-requests/:id 相当（未設計）。
 * 一覧から渡された情報をそのまま信じず、開いた時点の状態を確認するために使う。
 */
export function fetchMockPaymentRequest(
  direction: PaymentRequestDirection,
  id: string,
): Promise<PaymentRequest | null> {
  const source =
    direction === 'received'
      ? [...mockReceivedPaymentRequests, ...mockHistories.received]
      : mockHistories.sent;

  return Promise.resolve(source.find((request) => request.id === id) ?? null);
}

// 操作を実行できる向き。実APIはacceptとrejectを被請求者だけ、cancelを請求者だけに
// 許し、違反すると403を返す（Issue #71）。モックでも同じ範囲に絞り、繋ぎ間違いが
// 実APIに繋いだ後ではなくこの段階で分かるようにする。
const actorDirections: Record<PaymentRequestAction, PaymentRequestDirection> = {
  accept: 'received',
  reject: 'received',
  cancel: 'sent',
};

// 拒否と取り消しはどちらもrejectedになる。実APIはresponded_byで実行者を残して
// 区別するが、モックは状態しか持たないため、ここでは同じ状態へ倒す。
const resultStatuses: Record<
  PaymentRequestAction,
  Exclude<PaymentRequestStatus, 'pending'>
> = {
  accept: 'accepted',
  reject: 'rejected',
  cancel: 'rejected',
};

/**
 * モックの承認・拒否・取り消し。実APIは #71（マージ済み、繋ぎ込みは未着手）。
 * 対象が pending でなければ失敗させ、画面側が「すでに処理済み」を扱えるようにする。
 */
export function respondToMockPaymentRequest(
  direction: PaymentRequestDirection,
  id: string,
  action: PaymentRequestAction,
): Promise<PaymentRequest> {
  return fetchMockPaymentRequest(direction, id).then((request) => {
    if (!request) {
      throw new Error('この請求は見つかりませんでした');
    }

    if (actorDirections[action] !== direction) {
      throw new Error('この請求を操作する権限がありません');
    }

    if (request.status !== 'pending') {
      throw new Error('この請求はすでに処理されています');
    }

    return {
      ...request,
      status: resultStatuses[action],
      respondedAt: new Date(Date.UTC(2026, 7, 6, 3, 0)).toISOString(),
    } satisfies PaymentRequest;
  });
}
