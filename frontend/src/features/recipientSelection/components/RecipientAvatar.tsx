import { useState } from 'react';

import styles from '../recipientSelection.module.css';

interface RecipientAvatarProps {
  name: string;
  imageUrl: string;
}

/**
 * 相手のアイコン。写真は「速く見つける」ための補助なので alt は空にし、
 * 識別は氏名テキストへ委ねる。画像の読み込みに失敗したら氏名の頭文字を代替表示する。
 */
export function RecipientAvatar({ name, imageUrl }: RecipientAvatarProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <span className={styles.avatar} aria-hidden="true">
        {name.slice(0, 1)}
      </span>
    );
  }

  return (
    <img
      className={styles.avatar}
      src={imageUrl}
      alt=""
      onError={() => {
        setHasError(true);
      }}
    />
  );
}
