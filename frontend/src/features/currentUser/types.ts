/** ホーム画面などで表示する現在ユーザー。バックエンド GET /api/me のレスポンスに対応する。 */
export interface CurrentUser {
  /** 内部UUID（users.id、公開user_idではない）。 */
  id: string;
  /** 表示名。 */
  name: string;
  /** アイコン画像の相対URL（例: /assets/profiles/human1.png）。 */
  profileUrl: string;
  /** 円単位の非負整数で表す現在残高。 */
  balance: number;
}
