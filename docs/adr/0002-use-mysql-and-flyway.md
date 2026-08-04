# ADR 0002: MySQLとFlywayでユーザーデータを管理する

## ステータス

採用

## 背景

ユーザーの顔写真を選択して送金相手を決める機能に向けて、ユーザー情報と残高を永続化する必要がある。チーム開発では各環境へ同じschemaを再現し、変更履歴を追跡できることが必要になる。

## 課題

- ローカル環境とCIで同じMySQLを再現する
- 適用済みschemaと未適用migrationを区別する
- 内部識別子と、将来の友達追加に使う公開IDを分離する
- DBを必要としない変更で、重いDB CIを起動しない
- 開発用シードを本番migrationへ混ぜない
- ローカル利用に限定された提供画像を公開リポジトリで再配布しない

## 選択肢

1. Docker ComposeのMySQLとFlywayでversioned SQLを管理する
2. MySQLの初期化ディレクトリへSQLを直接配置する
3. バックエンドORMのmigration機能を使う

## 採用した案

MySQL 8.4.10とFlyway 13.1.0をDocker Composeで起動し、`database/migrations`のversioned SQLを適用する。

## 採用理由

- 初期化SQLと異なり、既存DBへ未適用分だけを順番に適用できる
- バックエンド実装より先にDB schemaを独立してレビューできる
- SQLが明示的で、テーブル定義と制約を確認しやすい
- MySQL 8.4はLTS系列で、UUID式のデフォルト値を利用できる

## データ設計

- `id`: `BINARY(16)`の内部UUID主キー。DBが自動生成する
- `user_id`: 友達追加で共有する公開ID。`UNIQUE`制約を持つ
- `balance`: 円単位の`BIGINT UNSIGNED`
- `profile_url`: 画像本体ではなく公開assetの相対URLを保存する
- `created_at`: INSERT時にMySQLが作成日時を自動設定する

## メリット

- UUIDの索引サイズを文字列形式より小さくできる
- 公開IDを変更可能な値として内部主キーから切り離せる
- migration適用と制約を実DBで検証できる
- 開発用30件シードを必要な環境だけへ投入できる
- DBには相対URLだけを保存し、提供画像をGit管理から除外できる

## デメリット

- Flywayコンテナの取得と運用が増える
- UUIDをAPIで扱う際に`BIN_TO_UUID` / `UUID_TO_BIN`変換が必要になる
- Dockerを利用できない環境ではDB検証を実行できない

## CI方針

通常のTypeScript CIではMySQLを起動しない。Database Migration CIは、migration、DBテスト、Compose、DB workflowの変更時だけ実行する。テストは開発用30件シードを使わず、制約確認に必要な最小レコードだけを作成する。

## assetの管理方針

提供されたプロフィール画像は再配布せず、各開発者が`frontend/public/assets/profiles`へローカル配置する。DBとシードには`/assets/profiles/human1.png`〜`human6.png`の相対URLだけを保存する。PNGは同ディレクトリの`.gitignore`でGit管理から除外する。

## rollback方針

データ消失を伴うrollbackは自動化しない。`database/rollback`に手動SQLを記録し、対象環境、バックアップ、影響範囲を確認してから実行する。`V1`のrollbackは`users`テーブルを削除するため、開発初期以外では原則使用しない。

## 将来的な見直し条件

- バックエンドで採用するDBライブラリがmigrationを一元管理する必要が生じたとき
- 公開`user_id`の文字種、長さ、変更可否が仕様として確定したとき
- 送金履歴追加により、残高更新のトランザクション・監査要件が確定したとき
- 本番環境のmigration実行方式が決定したとき

## Reference

- [MySQL 8.4: Data Type Default Values](https://dev.mysql.com/doc/refman/8.4/en/data-type-defaults.html)
- [MySQL Docker image tags](https://hub.docker.com/_/mysql/tags)
- [Flyway Docker image](https://hub.docker.com/r/flyway/flyway)
