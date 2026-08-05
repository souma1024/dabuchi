import { UserAvatar } from '../../transfer/components/UserAvatar';
import { formatTransactionDateTime } from '../formatTransactionDateTime';
import type { Transaction, TransactionDirection } from '../types';

// 送金は出ていく赤、受取は入ってくる緑。バッジの文字でも区別できるため色だけに依存しない。
const badgeStyles: Record<TransactionDirection, string> = {
  sent: 'border-red-600 bg-red-50 text-red-700',
  received: 'border-emerald-600 bg-emerald-50 text-emerald-700',
};

const amountStyles: Record<TransactionDirection, string> = {
  sent: 'text-red-700',
  received: 'text-emerald-700',
};

const directionLabels: Record<TransactionDirection, string> = {
  sent: '送金',
  received: '受取',
};

interface TransactionListItemProps {
  transaction: Transaction;
}

/**
 * 取引履歴の1行。相手のアイコン・種別バッジ・氏名・金額・日時を表示する。
 * 遷移先の詳細画面が無いため、行はタップできない（表示のみ）。
 */
export function TransactionListItem({ transaction }: TransactionListItemProps) {
  const { counterparty, direction, amount, createdAt } = transaction;

  return (
    <li className="flex min-h-[76px] items-center gap-3.5 border-b border-slate-100 px-4 py-3">      <UserAvatar
        name={counterparty.name}
        profileUrl={counterparty.profileUrl}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            className={`flex-none rounded border px-1.5 py-px text-[10px] font-bold ${badgeStyles[direction]}`}
          >
            {directionLabels[direction]}
          </span>
          <span className="min-w-0 truncate text-[15px] font-semibold text-slate-800">
            {counterparty.name}
          </span>
        </div>
        <div className="mt-0.5 text-xs text-slate-500">
          {formatTransactionDateTime(createdAt)}
        </div>
      </div>

      <span
        className={`flex-none text-[15px] font-bold ${amountStyles[direction]}`}
      >
        {amount.toLocaleString()}円
      </span>
    </li>
  );
}
