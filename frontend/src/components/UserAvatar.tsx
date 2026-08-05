import { useState } from 'react';

interface UserAvatarProps {
  name: string;
  profileUrl?: string;
  // 既定は送金相手一覧などで使う中サイズ。ホーム画面のように主役として見せる場合はlargeを使う。
  size?: 'medium' | 'large';
}

const sizeStyles = {
  medium: { box: 'h-12 w-12', initial: 'text-lg' },
  large: { box: 'h-16 w-16', initial: 'text-2xl' },
} as const;

// public/assets/profiles配下に対応する画像がある場合はそれを表示し、
// 画像が無い（読み込み失敗を含む）場合は氏名の頭文字のプレースホルダーにフォールバックする。
export function UserAvatar({
  name,
  profileUrl,
  size = 'medium',
}: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const style = sizeStyles[size];

  if (profileUrl !== undefined && !imageFailed) {
    return (
      <img
        src={profileUrl}
        alt={name}
        onError={() => setImageFailed(true)}
        className={`${style.box} shrink-0 rounded-full object-cover`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${style.box} ${style.initial} flex shrink-0 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700`}
    >
      {name.charAt(0)}
    </span>
  );
}
