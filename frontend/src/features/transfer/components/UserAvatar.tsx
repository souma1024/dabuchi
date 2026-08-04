interface UserAvatarProps {
  name: string;
}

// 提供素材のアイコン画像は再配布不可のため、氏名の頭文字によるプレースホルダーで代替する。
export function UserAvatar({ name }: UserAvatarProps) {
  return (
    <span
      aria-hidden="true"
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg font-semibold text-blue-700"
    >
      {name.charAt(0)}
    </span>
  );
}
