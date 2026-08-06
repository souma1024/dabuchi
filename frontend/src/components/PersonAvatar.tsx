import { useState } from 'react';

interface PersonAvatarProps {
  name: string;
  imageUrl: string;
}

const AVATAR_CLASS =
  'flex h-14 w-14 flex-none items-center justify-center rounded-full border border-slate-200 bg-slate-100 object-cover text-xl text-slate-400';

/**
 * 人物のアイコン。送金・請求の相手一覧と友達管理で同じ見た目に揃えるため共通化している。
 *
 * 写真は「速く見つける」ための補助なので alt は空にし、識別は氏名テキストへ委ねる。
 * 画像の読み込みに失敗したら氏名の頭文字を代替表示する。
 */
export function PersonAvatar({ name, imageUrl }: PersonAvatarProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <span className={AVATAR_CLASS} aria-hidden="true">
        {name.slice(0, 1)}
      </span>
    );
  }

  return (
    <img
      className={AVATAR_CLASS}
      src={imageUrl}
      alt=""
      onError={() => {
        setHasError(true);
      }}
    />
  );
}
