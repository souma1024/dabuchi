# 作業報告書

## 作業日時

2026年08月04日 14時25分41秒 JST

## 作業対象

MySQL / FlywayのDocker構成、`users`テーブル、開発用シード、migrationテスト、条件付きDatabase Migration CI。

## 作業目的

ユーザーの顔写真を選択する画面と、その後のbackend実装に先行して、ユーザー情報を保持するDB schemaを独立したPull Requestとして整備する。

## 変更内容

- MySQL 8.4.10とFlyway 13.1.0のDocker Compose構成を追加した
- 内部UUIDと公開`user_id`を分離した`users`テーブルを追加した
- 6種類のプロフィール画像をローカル配置し、Git除外ルールと配置手順を追加した
- 6画像を5回ずつ使用する開発用30件シードを追加した
- 開発用シードを使わない最小migrationテストを追加した
- DB関連ファイルの変更時だけ動くDatabase Migration CIを追加した
- rollback SQL、README、ADR、TODOを追加・更新した

## 変更したファイル

- DB構成: `compose.yaml`、`.env.example`、`package.json`
- Migration: `database/migrations/V1__create_users.sql`
- Rollback: `database/rollback/V1__drop_users.sql`
- Seed: `database/seeds/development.sql`、`database/scripts/seed.sh`
- Test / CI: `database/tests/run.sh`、`.github/workflows/database-ci.yml`
- Assets: `frontend/public/assets/profiles/.gitignore`、`frontend/public/assets/profiles/README.md`
- Docs: `README.md`、`docs/adr/0002-use-mysql-and-flyway.md`、`docs/TODO.md`、本報告書

## 変更意図

通常のTypeScript開発からDB起動コストを切り離しつつ、schema変更時には実際のMySQLへmigrationを適用して制約を確認するため。開発用シードはmigrationへ混ぜず、必要な環境だけへ明示的に投入できるようにした。

## 設計上の意図

- `id`は`BINARY(16)`の内部UUID主キーとし、MySQLが自動生成する
- `user_id`は友達追加用の公開IDとして`NOT NULL` / `UNIQUE`にする
- `balance`は円単位の非負整数として`BIGINT UNSIGNED`にする
- `profile_url`には画像本体でなく公開assetへの相対URLを保存する
- 提供画像はローカルだけに配置し、公開リポジトリへcommitしない
- `created_at`はINSERT時にMySQLが自動設定し、シード再実行では変更しない
- 開発用30件シードはDBテストへ投入せず、テストデータを最小化する
- テストごとに固有のCompose projectと一時volumeを使用し、完了時に削除する

## 影響範囲

DBのローカル開発手順、今後のusers取得API、プロフィール画像を使用するfrontend。提供画像本体はGit管理対象外であり、既存のbackend APIや既存DBデータへの変更はない。

## 追加・更新したテスト

実MySQLに対して以下を確認するmigrationテストを追加した。

- 6カラムの名称、型、NULL制約
- `id`の主キーとUUID自動生成
- `user_id`の一意制約
- `balance`のデフォルト値0と負数拒否

開発用30件シードはテストに投入していない。別のスモーク確認で30件投入と6画像へのURL参照を確認した。

## 実行した確認コマンド

- `npm run db:test`: migrationと最小DB統合テスト成功
- 開発用シードのスモーク確認: 30件、無効なprofile URL 0件
- `docker compose config --quiet`: 成功
- `bash -n database/scripts/seed.sh database/tests/run.sh`: 成功
- `npm run format`: 成功
- `npm run lint`: 成功
- `npm run typecheck`: 成功
- `npm test`: frontend 1件、backend 2件成功
- `npm run build`: frontend / backend成功
- `npm audit --audit-level=high`: 既知の脆弱性0件
- `git diff --check`: 成功
- テスト用Dockerコンテナ・volumeの残存なし

## CIで確認される内容

通常CIは全Pull Requestでformat、lint、typecheck、unit test、buildを確認する。Database Migration CIはmigration、DBテスト、Compose、DB workflowの変更時だけMySQLを起動し、Flyway migrationとDB制約を確認する。seedやassetだけの変更ではMySQLを起動しない。

## 未解決の課題

- 公開`user_id`の許可文字、長さ、変更可否は未確定
- 30件シードの表示名と残高は開発用の仮データ
- backendのDB接続、users一覧API、エラー設計は次のPR対象
- 本番migrationの実行主体とバックアップ方法は未確定

## 次にやること

users一覧取得APIのrequest、response、status codeを定義し、backendからMySQLへ接続する小さなPRを作成する。

## 次回最初に見るべきファイル

- `database/migrations/V1__create_users.sql`
- `compose.yaml`
- `database/tests/run.sh`
- `docs/adr/0002-use-mysql-and-flyway.md`
- `docs/TODO.md`

## 引き継ぎ事項

- 次回最初に`npm run db:test`を実行する
- 適用済みmigrationは編集せず、`V2`以降を追加する
- `id`と公開`user_id`をAPIやrepositoryで混同しない
- 残高更新は将来の送金履歴と同じDBトランザクションで扱う
- rollback SQLはデータを削除するため、自動実行しない
- frontendの画像URLは`/assets/profiles/human1.png`〜`human6.png`
- 提供画像は各自で`frontend/public/assets/profiles`へ置き、Gitへ追加しない
