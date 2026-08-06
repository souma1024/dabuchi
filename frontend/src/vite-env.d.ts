/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** バックエンドAPIのベースURL（未設定なら同一オリジン＝dev serverの/apiプロキシ経由）。 */
  readonly VITE_API_BASE_URL?: string;
}
