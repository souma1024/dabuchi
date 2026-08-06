# TODO

## 進行中

- [進行中] チームのMac・Windows環境でoverrideなしのCompose起動を確認する
- [進行中] 友達関係・個別メモ・ブロックのV4 migrationをレビューする
- [進行中] 友達管理backendをlayer単位のstacked PRで実装する

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
- [未着手] 請求承認時の残高更新・送金履歴作成・状態更新をDB transactionで実装する
- [未着手] 被請求者向けpending一覧と承認・拒否APIを設計する
- [未着手] 友達一覧・追加・個別メモ編集・ブロック・解除APIを実装する
- [未着手] ブロック・解除のapplication usecaseを実装する
- [未着手] 友達管理MySQL repositoryとprepared query unit testを実装する
- [未着手] 友達管理HTTP router・共通error形式・API testを実装する
- [未着手] 友達管理の依存をapp.tsとserver.tsへ配線する
- [未着手] ブロック関係を通常の友達・送金・請求候補から双方除外する
- [未着手] 友達管理・ブロックリスト画面を実装する
- [未着手] ホーム画面へ公開user_idを表示する別PRを作成する
- [未着手] 送金・請求へメッセージ欄を追加するか決定する（現状はDB・APIともmessage未対応のため画面から削除済み）

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
- [完了] 請求状態を送金履歴から分離するDB設計とV3 migrationを追加する
- [完了] server側current userから複数人分の個別金額請求を作成するAPIを実装する
- [完了] 請求作成backendをDockerと実MySQLで動作確認する
- [完了] 友達ペア・個別メモ・自己ブロックのdomain制約とunit testを追加する
- [完了] PR #50へ最新mainを取り込み、請求画面と取引履歴のroute競合を解消する
- [完了] PR #52へ更新済み#50を取り込み、ホーム画面テストの競合を解消する
- [完了] PR #56へ更新済み#52を取り込み、送信されないメッセージ欄の削除を再検証する
- [完了] 友達一覧のapplication usecaseとfactory-based unit testを追加する
- [完了] 友達詳細のapplication usecaseとブロック方向別の認可テストを追加する
- [完了] 自分がブロックしている一覧のapplication usecaseとunit testを追加する
- [完了] 公開user_idによる友達追加application usecaseとfactory-based unit testを追加する
- [完了] 友達固有note作成application usecaseとブロック方向別の認可テストを追加する
- [完了] 友達固有note更新・空文字削除・明示削除のapplication usecaseを追加する

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

ブロック・解除のapplication usecaseを、note更新・削除PRへ積む。
