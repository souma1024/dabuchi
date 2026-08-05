import { RecipientListItem } from './components/RecipientListItem';
import { useRecipients } from './hooks/useRecipients';
import type { Recipient } from './types';

interface RecipientSelectionScreenProps {
  /** 現在ログイン中のユーザーID（暫定。認証導入後はトークンから取得する）。 */
  currentUserId: string;
  /** 相手を選んだときに呼ばれる。送金画面への遷移は呼び出し側が担う。 */
  onSelectRecipient: (recipient: Recipient) => void;
  /** 戻る操作。未指定なら戻るボタンは表示しない。 */
  onBack?: () => void;
}

/** 送金相手を顔写真と氏名で選ぶ画面。 */
export function RecipientSelectionScreen({
  currentUserId,
  onSelectRecipient,
  onBack,
}: RecipientSelectionScreenProps) {
  const state = useRecipients(currentUserId);

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
          送金相手を選ぶ
        </h1>
        <span />
      </header>

      {state.status === 'loading' && (
        <p className="px-4 py-8 text-center text-slate-500">読み込み中…</p>
      )}

      {state.status === 'error' && (
        <p role="alert" className="px-4 py-8 text-center text-slate-500">
          {state.message}
        </p>
      )}

      {state.status === 'success' && state.recipients.length === 0 && (
        <p className="px-4 py-8 text-center text-slate-500">
          送金できる相手がいません。
        </p>
      )}

      {state.status === 'success' && state.recipients.length > 0 && (
        <ul className="m-0 flex-1 list-none p-0">
          {state.recipients.map((recipient) => (
            <RecipientListItem
              key={recipient.id}
              recipient={recipient}
              onSelect={onSelectRecipient}
            />
          ))}
        </ul>
      )}
    </main>
  );
}
