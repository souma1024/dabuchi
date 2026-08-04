/** 送金相手一覧に表示する1人分の情報。バックエンド GET /api/users/:currentUserId/recipients のレスポンス要素に対応する。 */
export interface Recipient {
  /** 内部UUID（users.id、公開user_idではない）。行の識別と、選択後の送金先指定に使う。 */
  id: string;
  /** 表示名。この画面での正の識別子（スクリーンリーダーが読み上げる）。 */
  name: string;
  /** アイコン画像の相対URL（例: /assets/profiles/human1.png）。 */
  imageUrl: string;
}
