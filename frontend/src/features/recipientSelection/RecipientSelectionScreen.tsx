import { useState } from 'react';

import { RecipientListItem } from './components/RecipientListItem';
import { useRecipients } from './hooks/useRecipients';
import type { Recipient } from './types';
import { useInfiniteScrollSentinel } from '../../hooks/useInfiniteScrollSentinel';

interface RecipientSelectionScreenBaseProps {
  /** 現在ログイン中のユーザーID（暫定。認証導入後はトークンから取得する）。 */
  currentUserId: string;
  /** 戻る操作。未指定なら戻るボタンは表示しない。 */
  onBack?: () => void;
  /** ヘッダー見出し。送金・請求で呼び出し側から文言を切り替える。 */
  title?: string;
  /** 候補0件時のメッセージ。送金・請求で呼び出し側から文言を切り替える。 */
  emptyMessage?: string;
}

interface SingleSelectionProps extends RecipientSelectionScreenBaseProps {
  selectionMode?: 'single';
  /** 相手を選んだときに呼ばれる。送金画面への遷移は呼び出し側が担う。 */
  onSelectRecipient: (recipient: Recipient) => void;
}

interface MultipleSelectionProps extends RecipientSelectionScreenBaseProps {
  selectionMode: 'multiple';
  /** 「次へ」を押したときに呼ばれる。選んだ順で渡す。 */
  onConfirmSelection: (recipients: Recipient[]) => void;
  /** 一度に選べる人数の上限。到達したら未選択の行を選べなくする。 */
  maxSelectionCount?: number;
}

type RecipientSelectionScreenProps =
  SingleSelectionProps | MultipleSelectionProps;

/**
 * 相手を顔写真と氏名で選ぶ画面。スクロール末尾で次ページを追加取得する。
 *
 * 送金は1人へ送るため、行タップで即座に確定する単一選択。
 * 請求は複数人へまとめて出せるため、チェックボックスで選んでから「次へ」で確定する。
 */
export function RecipientSelectionScreen(props: RecipientSelectionScreenProps) {
  const {
    currentUserId,
    onBack,
    title = '送金相手を選ぶ',
    emptyMessage = '送金できる相手がいません。',
  } = props;
  const {
    recipients,
    isLoadingInitial,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
  } = useRecipients(currentUserId);
  const sentinelRef = useInfiniteScrollSentinel<HTMLLIElement>(loadMore, []);
  // 選択済みの相手そのものを持つ。追加読み込みで一覧が伸びても選択が消えない。
  const [selected, setSelected] = useState<Recipient[]>([]);

  const isMultiple = props.selectionMode === 'multiple';
  const maxSelectionCount = isMultiple ? props.maxSelectionCount : undefined;
  const isSelectionFull =
    maxSelectionCount !== undefined && selected.length >= maxSelectionCount;

  const toggleSelection = (recipient: Recipient) => {
    setSelected((previous) =>
      previous.some(({ id }) => id === recipient.id)
        ? previous.filter(({ id }) => id !== recipient.id)
        : [...previous, recipient],
    );
  };

  const handleSelect = (recipient: Recipient) => {
    if (props.selectionMode === 'multiple') {
      toggleSelection(recipient);
      return;
    }
    props.onSelectRecipient(recipient);
  };

  const handleConfirm = () => {
    if (props.selectionMode === 'multiple') {
      props.onConfirmSelection(selected);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-white">
      <header className="grid grid-cols-[40px_1fr_40px] items-center border-b border-slate-200 px-3 py-3.5">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="戻る"
            className="h-10 w-10 border-none bg-transparent text-xl text-slate-500"
          >
            ←
          </button>
        ) : (
          <span />
        )}
        <h1 className="m-0 text-center text-base font-semibold text-slate-900">
          {title}
        </h1>
        <span />
      </header>

      {isLoadingInitial && (
        <p className="px-4 py-8 text-center text-slate-500">読み込み中…</p>
      )}

      {!isLoadingInitial && recipients.length === 0 && error && (
        <p role="alert" className="px-4 py-8 text-center text-slate-500">
          {error}
        </p>
      )}

      {!isLoadingInitial && recipients.length === 0 && !error && (
        <p className="px-4 py-8 text-center text-slate-500">{emptyMessage}</p>
      )}

      {recipients.length > 0 && (
        <ul className="m-0 flex-1 list-none p-0">
          {recipients.map((recipient) => {
            const isSelected = selected.some(({ id }) => id === recipient.id);
            return (
              <RecipientListItem
                key={recipient.id}
                recipient={recipient}
                onSelect={handleSelect}
                selection={
                  isMultiple
                    ? {
                        isSelected,
                        isDisabled: isSelectionFull && !isSelected,
                      }
                    : undefined
                }
              />
            );
          })}
          {hasMore && (
            <li ref={sentinelRef} aria-hidden="true" className="h-px" />
          )}
          {isLoadingMore && (
            <li className="px-4 py-4 text-center text-slate-500">
              読み込み中…
            </li>
          )}
          {error && (
            <li role="alert" className="px-4 py-4 text-center text-slate-500">
              {error}
            </li>
          )}
        </ul>
      )}

      {isMultiple && (
        <div className="sticky bottom-0 flex items-center gap-3 border-t border-slate-200 bg-white px-4 py-3">
          <span className="flex-1 text-sm text-slate-600">
            {`選択中 ${selected.length}人`}
          </span>
          {isSelectionFull && (
            <span className="text-sm text-red-600">
              {`一度に選べるのは${String(maxSelectionCount)}人までです`}
            </span>
          )}
          <button
            type="button"
            disabled={selected.length === 0}
            onClick={handleConfirm}
            className="flex-none rounded-2xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            次へ
          </button>
        </div>
      )}
    </main>
  );
}
