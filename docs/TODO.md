# TODO

## 進行中

- [進行中] チームのMac・Windows環境でoverrideなしのCompose起動を確認する

## 未着手

- [未着手] チームで開発コースとMVPの範囲を確定する
- [未着手] 画面一覧とユーザーストーリーを整理する
- [未着手] APIのrequest / response / status codeを機能ごとに設計する
- [未着手] 認証・認可が必要な機能範囲を決定する
- [未着手] frontendからbackendへの接続方法と環境変数を定義する
- [未着手] ユーザー選択画面から候補一覧APIへ接続する
- [未着手] PR #2の送金相手型を候補一覧に必要な項目へ分離する
- [未着手] 公開`user_id`の文字種・長さ・変更可否を決定する
- [未着手] 送金時の残高更新と履歴管理をトランザクションとして設計する

## 完了

- [完了] PR #40のMySQL外部キー違反判定を共通化し、重複実装を解消する
- [完了] PR #5の送る相手候補取得基盤をmainへマージする
- [完了] PR #7のHTTP endpointとAPI仕様をmainへマージする
- [完了] 実MySQLで候補一覧APIが500になるLIMITパラメータ型を修正する
- [完了] 開発用シードをutf8mb4で投入し、日本語名の文字化けを防止する
- [完了] PR #7のDB設定エラーで具体的な原因を安全にログ出力する
- [完了] PR #5へPR #2マージ後の最新mainを取り込み、lockfile競合を解消する
- [完了] frontendをReact / TypeScript / Viteで初期化する
- [完了] backendをNode.js / TypeScript / Expressで初期化する
- [完了] formatter / lint / typecheck / test / buildをCIへ追加する
- [完了] frontendとbackendの初期unit testを追加する
- [完了] 初期ディレクトリ構成とCIをPull Requestでレビュー・マージする
- [完了] MySQL / FlywayのDocker構成を追加する
- [完了] 内部UUIDと公開`user_id`を分離したusers migrationを追加する
- [完了] 6画像を参照する開発用30件シードを追加する
- [完了] migration専用の最小DB統合テストを追加する
- [完了] 送る相手候補一覧APIのrequest / response / status codeを定義する
- [完了] 20件単位のカーソルページングを実装する
- [完了] factory-basedの候補一覧unit / HTTP / repositoryテストを追加する
- [完了] 公開`user_id`からホーム表示用ユーザーを取得するrepository / usecaseとfactory-basedテストを追加する
- [完了] 開発用mockログイン設定と`GET /api/me`を追加する
- [完了] ローカルbackend起動時にルート`.env`を読み込む
- [完了] Vite proxyをローカル起動とCompose起動の両方に対応させる
- [完了] PR #6マージ後のmainを空のDocker volumeから再構築して実APIを確認する
- [完了] Composeのworkspace指定とLinux ARM64 musl binding不足を修正する

## 保留・要確認

- [要確認] ステップアップコースとアジャイル実践コースのどちらを採用するか
- [要確認] 本番デプロイ先と運用方法
- [要確認] 30件シードのユーザー名・残高を最終仕様に合わせるか
- [要確認] 認証導入後に現在ユーザーIDを取得する方式

## 技術的負債

- DB CIはmigration・seed関連の変更時だけ起動する方針のため、backend repositoryはfactory-based testで検証している
- users件数増加時に`created_at, id`の複合indexを検討する
- npm auditで既存依存のhigh severity 2件が報告されるため、影響範囲と安全な更新先を確認する

## 次回最初に着手するタスク

cross-platform Compose修正PRをMac・Windowsのチームメンバーに確認してもらう。
