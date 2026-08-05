import type { Counterparty, Transaction, TransactionPage } from './types';

// 添字アクセスがundefinedにならないよう、先頭要素の存在を型で保証する。
type NonEmpty<T> = readonly [T, ...T[]];

// 開発用シード（database/seeds/development.sql）の氏名・画像に合わせている。
const counterparties: NonEmpty<Counterparty> = [
  { id: 'friend-002', name: '佐藤 花子', profileUrl: '/assets/profiles/human2.png' },
  { id: 'friend-003', name: '鈴木 一郎', profileUrl: '/assets/profiles/human3.png' },
  { id: 'friend-004', name: '高橋 美咲', profileUrl: '/assets/profiles/human4.png' },
  { id: 'friend-005', name: '田中 健太', profileUrl: '/assets/profiles/human5.png' },
  { id: 'friend-006', name: '伊藤 結衣', profileUrl: '/assets/profiles/human6.png' },
  { id: 'friend-007', name: '渡辺 翔太', profileUrl: '/assets/profiles/human1.png' },
];

const amounts: NonEmpty<number> = [
  3000, 1200, 500, 12000, 800, 2400, 15000, 300,
];

// 追加読み込みを確認するため、1ページ（20件）を超える件数を用意する。
const MOCK_COUNT = 32;

/**
 * 新しい順に並んだ取引のモック。
 * 日時はテストの再現性のため固定値から算出し、実行時刻に依存させない。
 */
export const mockTransactions: Transaction[] = Array.from(
  { length: MOCK_COUNT },
  (_, index) => {
    const counterparty =
      counterparties[index % counterparties.length] ?? counterparties[0];
    const amount = amounts[index % amounts.length] ?? amounts[0];
    const day = 5 - Math.floor(index / 4);
    const jstHour = 20 - (index % 4) * 5;

    return {
      // APIはBIGINTを文字列で返す（Issue #18）。数値化しない前提に合わせて文字列にする。
      id: `mock-transaction-${String(index + 1).padStart(2, '0')}`,
      counterparty,
      amount,
      direction: index % 3 === 0 ? 'received' : 'sent',
      // APIはISO 8601のUTCを返す（Issue #18）。表示したいJSTから9時間引いて生成する。
      createdAt: new Date(
        Date.UTC(2026, 7, day, jstHour - 9, 15),
      ).toISOString(),
    } satisfies Transaction;
  },
);

const PAGE_SIZE = 20;

/**
 * モックの取引を1ページ分返す。
 * API連携（Issue #20）で本物のクライアントへ差し替える前提の暫定実装。
 * カーソルは次ページ先頭のindexをそのまま文字列にしただけの簡易版。
 */
export function fetchMockTransactionPage(
  cursor: string | null = null,
): Promise<TransactionPage> {
  const start = cursor === null ? 0 : Number(cursor);
  const end = start + PAGE_SIZE;
  const transactions = mockTransactions.slice(start, end);

  return Promise.resolve({
    transactions,
    nextCursor: end < mockTransactions.length ? String(end) : null,
  });
}
