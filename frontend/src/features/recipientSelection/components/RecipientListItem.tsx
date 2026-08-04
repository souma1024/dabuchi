import type { Recipient } from '../types';
import styles from '../recipientSelection.module.css';
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
    <li className={styles.person}>
      <button
        type="button"
        className={styles.personButton}
        onClick={() => {
          onSelect(recipient);
        }}
      >
        <RecipientAvatar name={recipient.name} imageUrl={recipient.imageUrl} />
        <span className={styles.name}>{recipient.name}</span>
        <span className={styles.chevron} aria-hidden="true">
          ›
        </span>
      </button>
    </li>
  );
}
