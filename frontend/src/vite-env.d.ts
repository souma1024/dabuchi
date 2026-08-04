/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** バックエンドAPIのベースURL（未設定なら同一オリジン＝dev serverの/apiプロキシ経由）。 */
  readonly VITE_API_BASE_URL?: string;
  /** 現在ユーザーのUUID（暫定。認証導入までの開発用）。 */
  readonly VITE_CURRENT_USER_ID?: string;
}
