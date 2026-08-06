import type { BlockedFriend, Friend, FriendProfile } from '../types';

// 未設定なら同一オリジン（Vite dev serverの /api プロキシ経由）を使う。
const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '';

/** 友達の1ページ分。 */
export interface FriendPage {
  friends: Friend[];
  nextCursor: string | null;
}

/** ブロック中の友達の1ページ分。 */
export interface BlockedFriendPage {
  friends: BlockedFriend[];
  nextCursor: string | null;
}

/** APIのエラーレスポンスに含まれるcode。画面側の出し分けに使う。 */
export class FriendApiError extends Error {
  constructor(
    message: string,
    readonly code: string | null,
  ) {
    super(message);
    this.name = 'FriendApiError';
  }
}

function invalidResponseError(): Error {
  return new Error('友達の取得に失敗しました（不正なレスポンス）');
}

function isFriendProfile(value: unknown): value is FriendProfile {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const profile = value as Record<string, unknown>;
  return (
    typeof profile.id === 'string' &&
    typeof profile.userId === 'string' &&
    typeof profile.name === 'string' &&
    typeof profile.profileUrl === 'string'
  );
}

function isFriend(value: unknown): value is Friend {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const friend = value as Record<string, unknown>;
  return (
    typeof friend.friendshipId === 'string' &&
    isFriendProfile(friend.friend) &&
    isFriendProfile(friend.addedBy) &&
    // 文字列であっても日付として解釈できなければ、表示時に日時が空欄になるため弾く。
    typeof friend.addedAt === 'string' &&
    !Number.isNaN(new Date(friend.addedAt).getTime()) &&
    (friend.note === null || typeof friend.note === 'string')
  );
}

/** 外部入力であるレスポンスを実行時に検証する（型を盲信しない）。 */
function parseFriendsResponse(data: unknown): FriendPage {
  if (typeof data !== 'object' || data === null) {
    throw invalidResponseError();
  }
  const body = data as Record<string, unknown>;

  const rawFriends = body.friends;
  if (!Array.isArray(rawFriends)) {
    throw invalidResponseError();
  }
  const friends: Friend[] = [];
  for (const item of rawFriends as unknown[]) {
    if (!isFriend(item)) {
      throw invalidResponseError();
    }
    friends.push(item);
  }

  const pageInfo = body.pageInfo;
  if (typeof pageInfo !== 'object' || pageInfo === null) {
    throw invalidResponseError();
  }
  const nextCursor = (pageInfo as Record<string, unknown>).nextCursor;
  if (nextCursor !== null && typeof nextCursor !== 'string') {
    throw invalidResponseError();
  }

  // hasNextPageはnextCursorの有無から判定できるため、画面側へは持ち出さない。
  return { friends, nextCursor };
}

function isBlockedFriend(value: unknown): value is BlockedFriend {
  if (!isFriend(value)) {
    return false;
  }
  const blockedAt = (value as { blockedAt?: unknown }).blockedAt;
  return (
    typeof blockedAt === 'string' &&
    !Number.isNaN(new Date(blockedAt).getTime())
  );
}

/** ブロック一覧は友達一覧と同じ形にblockedAtが加わる。 */
function parseBlockedFriendsResponse(data: unknown): BlockedFriendPage {
  const { friends, nextCursor } = parseFriendsResponse(data);
  const blockedFriends: BlockedFriend[] = [];

  for (const friend of friends) {
    if (!isBlockedFriend(friend)) {
      throw invalidResponseError();
    }
    blockedFriends.push(friend);
  }

  return { friends: blockedFriends, nextCursor };
}

function parseAddedFriend(data: unknown): Friend {
  if (typeof data !== 'object' || data === null) {
    throw invalidResponseError();
  }
  const friendship = (data as Record<string, unknown>).friendship;
  if (!isFriend(friendship)) {
    throw invalidResponseError();
  }
  return friendship;
}

/** エラーレスポンスからcodeを取り出す。形が違えばnull。 */
function readErrorCode(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) {
    return null;
  }
  const error = (data as Record<string, unknown>).error;
  if (typeof error !== 'object' || error === null) {
    return null;
  }
  const code = (error as Record<string, unknown>).code;
  return typeof code === 'string' ? code : null;
}

// 追加が失敗する理由は利用者の入力次第で変わるため、codeごとに次の行動が分かる文言にする。
const ADD_FRIEND_MESSAGES: Record<string, string> = {
  INVALID_REQUEST: 'ユーザーIDの形式が正しくありません',
  FRIEND_USER_NOT_FOUND: 'そのユーザーIDのユーザーが見つかりません',
  FRIENDSHIP_ALREADY_EXISTS: 'すでに友達です',
};

function buildFriendsUrl(path: string, cursor?: string | null): URL {
  const base = API_BASE_URL || window.location.origin;
  const url = new URL(path, base);
  if (cursor) {
    url.searchParams.set('cursor', cursor);
  }
  return url;
}

/**
 * 友達を1ページ分（20件）取得する。
 * 対象ユーザーはserver側のログイン中ユーザーから決まるため、URLやクエリで指定しない。
 * ブロック中の相手の除外、並び順、ページングはバックエンドの責務。
 * 追加ページは呼び出し側がnextCursorを使って取得する。
 */
export async function fetchFriends(
  cursor: string | null = null,
  signal?: AbortSignal,
): Promise<FriendPage> {
  const response = await fetch(buildFriendsUrl('/api/friends', cursor), {
    signal,
  });
  if (!response.ok) {
    throw new Error(`友達の取得に失敗しました (HTTP ${response.status})`);
  }

  const data: unknown = await response.json();
  return parseFriendsResponse(data);
}

/**
 * ブロック中の友達を1ページ分（20件）取得する。
 * 自分がブロックした相手だけが返る。
 */
export async function fetchBlockedFriends(
  cursor: string | null = null,
  signal?: AbortSignal,
): Promise<BlockedFriendPage> {
  const response = await fetch(
    buildFriendsUrl('/api/friends/blocked', cursor),
    { signal },
  );
  if (!response.ok) {
    throw new Error(
      `ブロックリストの取得に失敗しました (HTTP ${response.status})`,
    );
  }

  const data: unknown = await response.json();
  return parseBlockedFriendsResponse(data);
}

/** メモ保存のレスポンスから本文を取り出す。削除された場合はnull。 */
function parseSavedNote(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) {
    throw invalidResponseError();
  }
  const note = (data as { note?: unknown }).note;

  if (note === null) {
    return null;
  }
  if (typeof note !== 'object') {
    throw invalidResponseError();
  }
  const message = (note as { message?: unknown }).message;
  if (typeof message !== 'string') {
    throw invalidResponseError();
  }

  return message;
}

/**
 * 自分用メモを保存する。空文字を渡すとメモを削除する。
 *
 * 作成はPOST、更新はPUTと分かれており、メモが無い状態へPUTすると404になる。
 * 画面側で使い分けさせないよう、現在メモがあるかどうかを受け取ってここで振り分ける。
 */
export async function saveFriendshipNote(
  friendshipId: string,
  message: string,
  hasExistingNote: boolean,
  signal?: AbortSignal,
): Promise<string | null> {
  const url = buildFriendsUrl(
    `/api/friends/${encodeURIComponent(friendshipId)}/note`,
  );

  // メモが無く、本文も空なら何もすることがない。
  if (!hasExistingNote && message.trim() === '') {
    return null;
  }

  const response = await fetch(url, {
    method: hasExistingNote ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`メモの保存に失敗しました (HTTP ${response.status})`);
  }

  const data: unknown = await response.json();
  return parseSavedNote(data);
}

/** 友達をブロックする。すでにブロック済みでも成功する（冪等）。 */
export async function blockFriend(
  friendshipId: string,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(
    buildFriendsUrl(`/api/friends/${encodeURIComponent(friendshipId)}/block`),
    { method: 'POST', signal },
  );
  if (!response.ok) {
    throw new Error(`ブロックに失敗しました (HTTP ${response.status})`);
  }
}

/** ブロックを解除する。ブロックしていなくても成功する（冪等）。 */
export async function unblockFriend(
  friendshipId: string,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(
    buildFriendsUrl(`/api/friends/${encodeURIComponent(friendshipId)}/block`),
    { method: 'DELETE', signal },
  );
  if (!response.ok) {
    throw new Error(`ブロック解除に失敗しました (HTTP ${response.status})`);
  }
}

/**
 * 公開user_idを指定して友達を追加する。
 * 相手の存在確認・重複チェックはバックエンドの責務で、失敗理由はcodeで返る。
 */
export async function addFriend(
  friendUserId: string,
  signal?: AbortSignal,
): Promise<Friend> {
  const response = await fetch(buildFriendsUrl('/api/friends'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ friendUserId }),
    signal,
  });
  const data: unknown = await response.json();

  if (!response.ok) {
    const code = readErrorCode(data);
    throw new FriendApiError(
      (code !== null ? ADD_FRIEND_MESSAGES[code] : undefined) ??
        `友達の追加に失敗しました (HTTP ${response.status})`,
      code,
    );
  }

  return parseAddedFriend(data);
}
