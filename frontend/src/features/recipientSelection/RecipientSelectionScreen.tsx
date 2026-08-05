import { useEffect, useRef } from 'react';

import { RecipientListItem } from './components/RecipientListItem';
import { useRecipients } from './hooks/useRecipients';
import type { Recipient } from './types';

interface RecipientSelectionScreenProps {
  /** 現在ログイン中のユーザーID（暫定。認証導入後はトークンから取得する）。 */
  currentUserId: string;
  /** 相手を選んだときに呼ばれる。送金・請求画面への遷移は呼び出し側が担う。 */
  onSelectRecipient: (recipient: Recipient) => void;
  /** 戻る操作。未指定なら戻るボタンは表示しない。 */
  onBack?: () => void;
  /** ヘッダー見出し。送金・請求で呼び出し側から文言を切り替える。 */
  title?: string;
  /** 候補0件時のメッセージ。送金・請求で呼び出し側から文言を切り替える。 */
  emptyMessage?: string;
}

/** 相手を顔写真と氏名で選ぶ画面。スクロール末尾で次ページを追加取得する。 */
export function RecipientSelectionScreen({
  currentUserId,
  onSelectRecipient,
  onBack,
  title = '送金相手を選ぶ',
  emptyMessage = '送金できる相手がいません。',
}: RecipientSelectionScreenProps) {
  const {
    recipients,
    isLoadingInitial,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
  } = useRecipients(currentUserId);
  const sentinelRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) {
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        loadMore();
      }
    });
    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [loadMore, hasMore, recipients.length]);

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
          {recipients.map((recipient) => (
            <RecipientListItem
              key={recipient.id}
              recipient={recipient}
              onSelect={onSelectRecipient}
            />
          ))}
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
    </main>
  );
}
