import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { ScreenHeader } from '../../../components/ScreenHeader';
import { useInfiniteScrollSentinel } from '../../../hooks/useInfiniteScrollSentinel';
import { useScrollToTop } from '../../../hooks/useScrollToTop';
import { AddFriendForm } from '../components/AddFriendForm';
import { FriendCard } from '../components/FriendCard';
import { FriendDetailFlyout } from '../components/FriendDetailFlyout';
import { useFriends } from '../hooks/useFriends';
import type { Friend, FriendSort } from '../types';

const SORT_OPTIONS: readonly { value: FriendSort; label: string }[] = [
  { value: 'created-asc', label: '古い順' },
  { value: 'created-desc', label: '新しい順' },
];

interface FriendsPageProps {
  /** 戻る操作。未指定なら戻るボタンは表示しない。 */
  onBack?: () => void;
  /** ブロックリストを開く操作。未指定ならボタンを表示しない。 */
  onOpenBlockedFriends?: () => void;
}

/**
 * 友達管理画面。友達の一覧表示・追加と、行ごとの詳細（メモとブロック）を扱う。
 * スクロール末尾で次ページを追加取得する。
 *
 * ブロックした相手はAPIの一覧からは外れるが、その場では行を消さず「ブロック中」に切り替える。
 * 押した直後に行が消えると、何が起きたのか分からないため。
 */
export function FriendsPage({
  onBack,
  onOpenBlockedFriends,
}: FriendsPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const sort: FriendSort =
    searchParams.get('sort') === 'created-desc'
      ? 'created-desc'
      : 'created-asc';
  const {
    friends,
    isLoadingInitial,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    reload,
  } = useFriends(sort);
  const sentinelRef = useInfiniteScrollSentinel<HTMLLIElement>(loadMore);
  const [openedFriendshipId, setOpenedFriendshipId] = useState<string | null>(
    null,
  );
  // この画面でブロック・解除した相手。APIの一覧を取り直すまでの表示に使う。
  const [blockedIds, setBlockedIds] = useState<readonly string[]>([]);

  const openedFriend =
    friends.find((friend) => friend.friendshipId === openedFriendshipId) ??
    null;

  const handleBlockedChange = (friendshipId: string, isBlocked: boolean) => {
    setBlockedIds((previous) =>
      isBlocked
        ? [...previous, friendshipId]
        : previous.filter((id) => id !== friendshipId),
    );
  };

  useScrollToTop([sort]);

  const selectSort = (nextSort: FriendSort) => {
    setSearchParams(nextSort === 'created-desc' ? { sort: nextSort } : {}, {
      replace: true,
    });
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-white">
      <div className="sticky top-0 z-10 bg-white">
        <ScreenHeader title="友達管理" onBack={onBack} />

        <div
          aria-label="友達一覧の並び順"
          role="group"
          className="flex gap-2 border-b border-slate-200 px-4 py-3"
        >
          {SORT_OPTIONS.map((option) => {
            const isSelected = option.value === sort;

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isSelected}
                onClick={() => selectSort(option.value)}
                className={`min-h-[40px] rounded-full px-4 text-sm font-semibold transition ${
                  isSelected
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 友達が0件でも詰まないよう、一覧の前に追加を置く。 */}
      <AddFriendForm onAdded={reload} />

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
          まだ友達がいません
        </p>
      )}

      {friends.length > 0 && (
        <ul className="m-0 flex-1 list-none p-0">
          {friends.map((friend) => (
            <FriendCard
              key={friend.friendshipId}
              friend={friend}
              isBlocked={blockedIds.includes(friend.friendshipId)}
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

      {onOpenBlockedFriends && (
        <div className="sticky bottom-0 border-t border-slate-200 bg-white px-4 py-3">
          <button
            type="button"
            onClick={onOpenBlockedFriends}
            className="w-full rounded-2xl border border-slate-300 bg-transparent px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            ブロックリスト
          </button>
        </div>
      )}

      {openedFriend && (
        <FriendDetailFlyout
          friend={openedFriend}
          isBlocked={blockedIds.includes(openedFriend.friendshipId)}
          onBlockedChange={handleBlockedChange}
          onClose={(hasChanges: boolean) => {
            setOpenedFriendshipId(null);
            // ブロックやメモを変えていたら、閉じた時点で一覧をAPIと合わせ直す。
            if (hasChanges) {
              setBlockedIds([]);
              reload();
            }
          }}
        />
      )}
    </main>
  );
}
