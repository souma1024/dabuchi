export interface CurrentUser {
  /** 内部UUID。画面遷移や送金先の指定に使う。 */
  id: string;
  /** 公開user_id。友達追加で相手に伝えてもらう値。 */
  userId: string;
  name: string;
  profileUrl: string;
  balance: number;
}
