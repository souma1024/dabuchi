/** 友達本人・追加者に共通するプロフィール。バックエンドのFriendProfileに対応する。 */
export interface FriendProfile {
  /** 内部UUID（users.id）。送金・請求の相手指定に使う。 */
  id: string;
  /** 公開user_id。友達追加で相手を指定するときに使う。 */
  userId: string;
  /** 表示名。 */
  name: string;
  /** アイコン画像の相対URL（例: /assets/profiles/human1.png）。 */
  profileUrl: string;
}

/** 友達1人分。GET /api/friends のレスポンス要素に対応する。 */
export interface Friend {
  /** friendships.idのUUID。詳細・メモ・ブロックの操作対象を指す。 */
  friendshipId: string;
  friend: FriendProfile;
  addedBy: FriendProfile;
  /** 友達になった日時（ISO 8601）。 */
  addedAt: string;
  /** 現在ユーザーが書いた自分用メモ。未設定ならnull。 */
  note: string | null;
}

/** ブロック中の友達1人分。GET /api/friends/blocked のレスポンス要素に対応する。 */
export interface BlockedFriend extends Friend {
  /** ブロックした日時（ISO 8601）。 */
  blockedAt: string;
}

/** 友達一覧の並び順。 */
export type FriendSort = 'created-asc' | 'created-desc';
