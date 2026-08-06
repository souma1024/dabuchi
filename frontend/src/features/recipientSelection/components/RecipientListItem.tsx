import type { Recipient } from '../types';
import { RecipientAvatar } from './RecipientAvatar';

/** 複数選択モードでの1行の状態。未指定なら単一選択（行タップで即確定）。 */
interface RecipientSelectionState {
  isSelected: boolean;
  /** 選択上限に達していて、これ以上選べない行。既に選択済みの行はfalse。 */
  isDisabled: boolean;
}

interface RecipientListItemProps {
  recipient: Recipient;
  onSelect: (recipient: Recipient) => void;
  selection?: RecipientSelectionState;
}

const ROW_CLASS =
  'flex min-h-[76px] w-full items-center gap-3.5 px-4 py-3 text-left hover:bg-slate-50';

/**
 * 相手リストの1行。氏名がアクセシブルな名前になる。
 * 単一選択では行全体がボタン、複数選択ではチェックボックスとして振る舞う。
 * どちらもタップした相手を親へ通知するだけで、遷移や選択状態の保持は親の責務。
 */
export function RecipientListItem({
  recipient,
  onSelect,
  selection,
}: RecipientListItemProps) {
  if (selection) {
    return (
      <li className="border-b border-slate-100">
        <label
          className={`${ROW_CLASS} ${selection.isDisabled ? 'opacity-50' : ''}`}
        >
          <input
            type="checkbox"
            checked={selection.isSelected}
            disabled={selection.isDisabled}
            onChange={() => {
              onSelect(recipient);
            }}
            className="h-5 w-5 flex-none accent-blue-600"
          />
          <RecipientAvatar
            name={recipient.name}
            imageUrl={recipient.imageUrl}
          />
          <span className="min-w-0 flex-1 truncate text-base font-semibold text-slate-800">
            {recipient.name}
          </span>
        </label>
      </li>
    );
  }

  return (
    <li className="border-b border-slate-100">
      <button
        type="button"
        onClick={() => {
          onSelect(recipient);
        }}
        className={`${ROW_CLASS} border-none bg-transparent`}
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
