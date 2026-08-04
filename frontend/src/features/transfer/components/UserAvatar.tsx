import { useState } from 'react';

interface UserAvatarProps {
  name: string;
  profileUrl?: string;
}

// public/assets/profiles配下に対応する画像がある場合はそれを表示し、
// 画像が無い（読み込み失敗を含む）場合は氏名の頭文字のプレースホルダーにフォールバックする。
export function UserAvatar({ name, profileUrl }: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);

  if (profileUrl !== undefined && !imageFailed) {
    return (
      <img
        src={profileUrl}
        alt={name}
        onError={() => setImageFailed(true)}
        className="h-12 w-12 shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg font-semibold text-blue-700"
    >
      {name.charAt(0)}
    </span>
  );
}
