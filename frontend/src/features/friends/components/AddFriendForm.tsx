import { useState } from 'react';

import { addFriend } from '../api/friendsClient';
import type { Friend } from '../types';

interface AddFriendFormProps {
  /** 追加に成功したときに呼ばれる。一覧の再読み込みは呼び出し側が担う。 */
  onAdded: (friend: Friend) => void;
}

function toErrorMessage(caught: unknown): string {
  return caught instanceof Error
    ? caught.message
    : '不明なエラーが発生しました';
}

/**
 * 公開user_idを入力して友達を追加するフォーム。
 * 送金・請求の相手候補一覧と友達一覧で共通に使う。
 */
export function AddFriendForm({ onAdded }: AddFriendFormProps) {
  const [friendUserId, setFriendUserId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedName, setAddedName] = useState<string | null>(null);

  const trimmedUserId = friendUserId.trim();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting || trimmedUserId === '') {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setAddedName(null);

    void addFriend(trimmedUserId)
      .then((friend) => {
        setFriendUserId('');
        setAddedName(friend.friend.name);
        onAdded(friend);
      })
      .catch((caught: unknown) => {
        setError(toErrorMessage(caught));
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 border-b border-slate-200 px-4 py-3"
    >
      <div className="flex items-center gap-2">
        <label htmlFor="friend-user-id" className="sr-only">
          ユーザーID
        </label>
        <input
          id="friend-user-id"
          type="text"
          value={friendUserId}
          onChange={(event) => {
            setFriendUserId(event.target.value);
          }}
          placeholder="ユーザーIDで友達を追加"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-2xl border border-slate-300 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={isSubmitting || trimmedUserId === ''}
          className="flex-none rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          追加
        </button>
      </div>

      {error !== null && (
        <p role="alert" className="m-0 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* 追加後は一覧が伸びるだけで何が起きたか分かりにくいため、名前で結果を伝える。 */}
      {addedName !== null && error === null && (
        <p role="status" className="m-0 text-sm text-slate-600">
          {`${addedName}を友達に追加しました`}
        </p>
      )}
    </form>
  );
}
