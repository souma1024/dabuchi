import type { Recipient } from '../types';
import { RecipientAvatar } from './RecipientAvatar';

interface RecipientListItemProps {
  recipient: Recipient;
  onSelect: (recipient: Recipient) => void;
}

/**
 * 送金相手リストの1行。行全体がタップ領域のボタンで、氏名がアクセシブルな名前になる。
 * タップするとその相手を選んだことを親へ通知する（遷移は親の責務）。
 */
export function RecipientListItem({
  recipient,
  onSelect,
}: RecipientListItemProps) {
  return (
    <li className="border-b border-slate-100">
      <button
        type="button"
        onClick={() => {
          onSelect(recipient);
        }}
        className="flex min-h-[76px] w-full items-center gap-3.5 border-none bg-transparent px-4 py-3 text-left hover:bg-slate-50"
      >
        <RecipientAvatar name={recipient.name} imageUrl={recipient.imageUrl} />
        <span className="min-w-0 flex-1 truncate text-base font-semibold text-slate-800">
          {recipient.name}
        </span>
        <span aria-hidden="true" className="flex-none text-lg text-slate-400">
          ›
        </span>
      </button>
    </li>
  );
}
