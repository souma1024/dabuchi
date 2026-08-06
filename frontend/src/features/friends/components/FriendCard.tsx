import { PersonAvatar } from '../../../components/PersonAvatar';
import type { Friend } from '../types';

interface FriendCardProps {
  friend: Friend;
  /** ブロック中なら行にその状態を示す。 */
  isBlocked: boolean;
  /** 3点リーダーを押したときに呼ばれる。詳細の開閉は親が持つ。 */
  onOpenDetail: (friend: Friend) => void;
}

/**
 * 友達管理の1行。送金・請求の相手一覧と同じ並びに揃える。
 * 違いは行末の3点リーダーで、押すと詳細（メモとブロック操作）を開く。
 */
export function FriendCard({
  friend,
  isBlocked,
  onOpenDetail,
}: FriendCardProps) {
  return (
    <li className="flex min-h-[76px] items-center gap-3.5 border-b border-slate-100 px-4 py-3">
      <PersonAvatar
        name={friend.friend.name}
        imageUrl={friend.friend.profileUrl}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-semibold text-slate-800">
          {friend.friend.name}
        </span>
        <span className="block truncate text-sm text-slate-500">
          {friend.friend.userId}
        </span>
      </span>

      {isBlocked && (
        <span className="flex-none rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600">
          ブロック中
        </span>
      )}

      <button
        type="button"
        onClick={() => {
          onOpenDetail(friend);
        }}
        aria-label={`${friend.friend.name}の詳細`}
        className="h-10 w-10 flex-none rounded-full border-none bg-transparent text-xl text-slate-400 hover:bg-slate-100"
      >
        ⋯
      </button>
    </li>
  );
}
