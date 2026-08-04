import { RecipientListItem } from './components/RecipientListItem';
import { useRecipients } from './hooks/useRecipients';
import styles from './recipientSelection.module.css';
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
    <main className={styles.screen}>
      <header className={styles.appBar}>
        {onBack ? (
          <button
            type="button"
            className={styles.back}
            onClick={onBack}
            aria-label="戻る"
          >
            ←
          </button>
        ) : (
          <span />
        )}
        <h1 className={styles.title}>送金相手を選ぶ</h1>
        <span />
      </header>

      {state.status === 'loading' && (
        <p className={styles.status}>読み込み中…</p>
      )}

      {state.status === 'error' && (
        <p className={styles.status} role="alert">
          {state.message}
        </p>
      )}

      {state.status === 'success' && state.recipients.length === 0 && (
        <p className={styles.status}>送金できる相手がいません。</p>
      )}

      {state.status === 'success' && state.recipients.length > 0 && (
        <ul className={styles.peopleList}>
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
