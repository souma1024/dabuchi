import { useState } from 'react';

import {
  blockFriend,
  saveFriendshipNote,
  unblockFriend,
} from '../api/friendsClient';
import type { Friend } from '../types';

interface FriendDetailFlyoutProps {
  friend: Friend;
  /** ブロック中かどうか。切り替え結果は親が保持する。 */
  isBlocked: boolean;
  /** ブロック状態が変わったときに呼ばれる。 */
  onBlockedChange: (friendshipId: string, isBlocked: boolean) => void;
  /** 閉じるときに呼ばれる。この画面で何か更新していればtrueを渡す。 */
  onClose: (hasChanges: boolean) => void;
}

function toErrorMessage(caught: unknown): string {
  return caught instanceof Error
    ? caught.message
    : '不明なエラーが発生しました';
}

/** Heroiconsのpencil-square。メモを書き換えられることを示す。 */
function PencilIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-4 w-4"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
      />
    </svg>
  );
}

/**
 * 友達1人の詳細フライアウト。友達追加時に入れたメモと、ブロック操作を出す。
 *
 * 画面下から出るシートにして、一覧のどの行から開いても同じ位置に出るようにする。
 * 一覧の取り直しは閉じたときにまとめて行い、開いている間の表示が入れ替わらないようにする。
 */
export function FriendDetailFlyout({
  friend,
  isBlocked,
  onBlockedChange,
  onClose,
}: FriendDetailFlyoutProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(friend.note);
  const [draft, setDraft] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const isEditingNote = draft !== null;

  const close = () => {
    onClose(hasChanges);
  };

  const toggleBlock = () => {
    if (isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    setError(null);

    const request = isBlocked ? unblockFriend : blockFriend;

    void request(friend.friendshipId)
      .then(() => {
        onBlockedChange(friend.friendshipId, !isBlocked);
        setHasChanges(true);
      })
      .catch((caught: unknown) => {
        setError(toErrorMessage(caught));
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const saveNote = () => {
    if (isSubmitting || draft === null) {
      return;
    }
    setIsSubmitting(true);
    setError(null);

    void saveFriendshipNote(friend.friendshipId, draft, note !== null)
      .then((saved) => {
        setNote(saved);
        setDraft(null);
        setHasChanges(true);
      })
      .catch((caught: unknown) => {
        setError(toErrorMessage(caught));
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  return (
    <div className="fixed inset-0 z-10 flex items-end justify-center">
      {/* 背景タップでも閉じられるようにする。 */}
      <button
        type="button"
        aria-label="詳細を閉じる"
        onClick={close}
        className="absolute inset-0 border-none bg-slate-900/40"
      />

      <section
        aria-label={`${friend.friend.name}の詳細`}
        className="relative w-full max-w-md rounded-t-2xl bg-white px-5 pt-5 pb-6 shadow-lg"
      >
        <h2 className="m-0 text-base font-semibold text-slate-900">
          {friend.friend.name}
        </h2>
        <p className="mt-1 mb-0 text-sm text-slate-500">
          {friend.friend.userId}
        </p>

        <div className="mt-5 flex items-center gap-2">
          <h3 className="m-0 text-xs font-semibold text-slate-500">メモ</h3>
          {!isEditingNote && (
            <button
              type="button"
              onClick={() => {
                setDraft(note ?? '');
              }}
              aria-label="メモを編集"
              className="flex h-7 w-7 items-center justify-center rounded-full border-none bg-transparent text-slate-400 hover:bg-slate-100"
            >
              <PencilIcon />
            </button>
          )}
        </div>

        {isEditingNote ? (
          <div className="mt-1">
            <label htmlFor="friendship-note" className="sr-only">
              メモ
            </label>
            <textarea
              id="friendship-note"
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
              }}
              rows={3}
              maxLength={255}
              placeholder="どこで知り合ったかなど"
              className="w-full resize-none rounded-2xl border border-slate-300 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400"
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={saveNote}
                disabled={isSubmitting}
                className="flex-1 rounded-2xl border-none bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                保存
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft(null);
                }}
                className="flex-1 rounded-2xl border border-slate-300 bg-transparent px-4 py-2 text-sm font-semibold text-slate-700"
              >
                キャンセル
              </button>
            </div>
            {/* 空のまま保存するとメモを消せることを、操作する前に伝える。 */}
            <p className="mt-2 mb-0 text-xs text-slate-400">
              空のまま保存するとメモを削除します
            </p>
          </div>
        ) : (
          <p className="m-0 text-sm text-slate-800">
            {note ?? 'メモはありません'}
          </p>
        )}

        {error !== null && (
          <p role="alert" className="mt-4 mb-0 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={toggleBlock}
            disabled={isSubmitting}
            className={
              isBlocked
                ? 'rounded-2xl border border-slate-300 bg-transparent px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400'
                : 'rounded-2xl border-none bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300'
            }
          >
            {isBlocked ? 'ブロックを解除する' : 'ブロックする'}
          </button>
          <button
            type="button"
            onClick={close}
            className="rounded-2xl border-none bg-transparent px-4 py-2 text-sm text-slate-500"
          >
            閉じる
          </button>
        </div>
      </section>
    </div>
  );
}
