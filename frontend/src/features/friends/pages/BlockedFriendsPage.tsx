import { useState } from 'react';

import { ScreenHeader } from '../../../components/ScreenHeader';
import { useInfiniteScrollSentinel } from '../../../hooks/useInfiniteScrollSentinel';
import { FriendCard } from '../components/FriendCard';
import { FriendDetailFlyout } from '../components/FriendDetailFlyout';
import { useBlockedFriends } from '../hooks/useBlockedFriends';
import type { Friend } from '../types';

interface BlockedFriendsPageProps {
  /** 戻る操作。未指定なら戻るボタンは表示しない。 */
  onBack?: () => void;
}

/**
 * ブロックリスト画面。自分がブロックした友達だけを並べ、詳細から解除できる。
 *
 * 解除しても行はその場では消さず「ブロック中」の表示だけを外す。
 * 押した直後に行が消えると、何が起きたのか分からないため。
 */
export function BlockedFriendsPage({ onBack }: BlockedFriendsPageProps) {
  const {
    friends,
    isLoadingInitial,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    reload,
  } = useBlockedFriends();
  const sentinelRef = useInfiniteScrollSentinel<HTMLLIElement>(loadMore);
  const [openedFriendshipId, setOpenedFriendshipId] = useState<string | null>(
    null,
  );
  // この画面で解除した相手。取得時点では全員ブロック中なので、外れた相手だけを持つ。
  const [unblockedIds, setUnblockedIds] = useState<readonly string[]>([]);

  const openedFriend =
    friends.find((friend) => friend.friendshipId === openedFriendshipId) ??
    null;

  const handleBlockedChange = (friendshipId: string, isBlocked: boolean) => {
    setUnblockedIds((previous) =>
      isBlocked
        ? previous.filter((id) => id !== friendshipId)
        : [...previous, friendshipId],
    );
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-white">
      <ScreenHeader title="ブロックリスト" onBack={onBack} />

      {isLoadingInitial && (
        <p className="px-4 py-8 text-center text-slate-500">読み込み中…</p>
      )}

      {!isLoadingInitial && friends.length === 0 && error && (
        <p role="alert" className="px-4 py-8 text-center text-slate-500">
          {error}
        </p>
      )}

      {!isLoadingInitial && friends.length === 0 && !error && (
        <p className="px-4 py-8 text-center text-slate-500">
          ブロック中の友達はいません
        </p>
      )}

      {friends.length > 0 && (
        <ul className="m-0 flex-1 list-none p-0">
          {friends.map((friend) => (
            <FriendCard
              key={friend.friendshipId}
              friend={friend}
              isBlocked={!unblockedIds.includes(friend.friendshipId)}
              onOpenDetail={({ friendshipId }: Friend) => {
                setOpenedFriendshipId(friendshipId);
              }}
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

      {openedFriend && (
        <FriendDetailFlyout
          friend={openedFriend}
          isBlocked={!unblockedIds.includes(openedFriend.friendshipId)}
          onBlockedChange={handleBlockedChange}
          onClose={(hasChanges: boolean) => {
            setOpenedFriendshipId(null);
            // 解除していたら、閉じた時点で一覧をAPIと合わせ直す（解除した相手は消える）。
            if (hasChanges) {
              setUnblockedIds([]);
              reload();
            }
          }}
        />
      )}
    </main>
  );
}
