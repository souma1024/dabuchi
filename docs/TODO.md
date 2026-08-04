# TODO

## 進行中

- [進行中] users migrationとDatabase Migration CIをPull Requestでレビューする

## 未着手

- [未着手] チームで開発コースとMVPの範囲を確定する
- [未着手] 画面一覧とユーザーストーリーを整理する
- [未着手] APIのrequest / response / status codeを機能ごとに設計する
- [未着手] 認証・認可が必要な機能範囲を決定する
- [未着手] frontendからbackendへの接続方法と環境変数を定義する
- [未着手] backendからusers一覧を取得するAPIを実装する
- [未着手] 公開`user_id`の文字種・長さ・変更可否を決定する
- [未着手] 送金時の残高更新と履歴管理をトランザクションとして設計する

## 完了

- [完了] frontendをReact / TypeScript / Viteで初期化する
- [完了] backendをNode.js / TypeScript / Expressで初期化する
- [完了] formatter / lint / typecheck / test / buildをCIへ追加する
- [完了] frontendとbackendの初期unit testを追加する
- [完了] 初期ディレクトリ構成とCIをPull Requestでレビュー・マージする
- [完了] MySQL / FlywayのDocker構成を追加する
- [完了] 内部UUIDと公開`user_id`を分離したusers migrationを追加する
- [完了] 6画像を参照する開発用30件シードを追加する
- [完了] migration専用の最小DB統合テストを追加する

## 保留・要確認

- [要確認] ステップアップコースとアジャイル実践コースのどちらを採用するか
- [要確認] 本番デプロイ先と運用方法
- [要確認] 30件シードのユーザー名・残高を最終仕様に合わせるか

## 技術的負債

- 現時点ではなし。機能追加時にテスト未整備やレイヤー逸脱を残さない。

## 次回最初に着手するタスク

users一覧取得APIのrequest / response / status codeを定義し、backend実装用のPRを作成する。
