# 作業報告書

## 作業日時

2026年08月05日 15時06分02秒

## 作業対象

PR #6マージ後の`main`とDocker Compose環境。

## 作業目的

過去のdabuchi関連Docker資産をすべて削除し、空のvolumeから最新mainを構築してfrontend、backend、MySQL、migration、seed、送金APIを実機確認する。

## 変更内容

- `main`を`8913f9a`へfast-forwardした
- dabuchi関連コンテナ10個、volume 11個、network 2個を削除した
- 新規volumeからMySQL 8.4.10、Flyway、backend、frontendを構築した
- overrideなしのCompose起動失敗を再現した
- 追跡対象外の一時overrideでfrontendをamd64、backendのworkspace指定を補正して検証した
- seed 30件を投入し、ホーム、候補一覧、送金保存APIとDBを確認した

## 変更したファイル

- `.env`（git管理対象外のローカル設定）
- `docs/TODO.md`
- 本報告書

## 変更意図

既存volumeやnode_modules cacheの影響を排除し、チームメンバーが最新mainを新規clone相当で起動できるか確認するため。

## 設計上の意図

検証用補正は`/private/tmp/dabuchi-main-fresh.override.yaml`へ閉じ込め、mainのCompose実装を変更せずに、構成不具合とアプリケーションコードの不具合を分離した。

## 影響範囲

ローカルDocker環境のみ。削除した以前のdabuchi DBデータは復元できない。現在は新しい`dabuchi` Compose projectが起動中で、開発seedと送金履歴1件を保持する。

## 追加・更新したテスト

コードテストの追加はない。既存のfrontend 42件、backend 48件、実HTTP・SQL確認を実行した。

## 実行した確認コマンド

- `git pull --ff-only origin main`: 成功、`8913f9a`
- `docker compose up --detach --wait`: DB migration成功、frontend/backendは起動失敗
- 一時override付き`docker compose up --detach --wait`: 起動成功
- `npm run db:seed`: 成功、users 30件
- `GET /health`: 200
- `GET /api/me`: 200、`friend-001`を返却
- `GET /api/users/:id/recipients`: 200、20件と次ページ情報
- `POST /api/transfers`: 201、transfersへ1件保存
- SQL確認: Flyway V1・V2成功、users 30件、transfers 1件、残高不変
- frontend format、lint、typecheck、42 tests、build: 成功
- backend lint、typecheck、build: 成功
- backend tests: arm64コンテナではbinding不足で起動失敗、amd64コンテナでは48件成功

## CIで確認される内容

通常CIはformat、lint、typecheck、unit test、buildを確認する。DB CIはmigration・seed関連変更時にFlywayとMySQLを確認する。

## 未解決の課題

- `compose.yaml`のbackend commandに`--workspace backend`がない
- `package-lock.json`に`@rolldown/binding-linux-arm64-musl`がなく、Apple SiliconのAlpineでfrontend起動とVitestが失敗する
- npm installは既存依存のhigh severity 2件を報告する
- ブラウザ操作環境が利用できず、UIの視覚・クリック確認は未実施

## 次にやること

Compose workspace指定とLinux ARM64 lockfileを修正し、overrideなしの完全新規構築で再検証する。

## 次回最初に見るべきファイル

- `compose.yaml`
- `package-lock.json`
- `backend/package.json`
- `frontend/package.json`

## 引き継ぎ事項

現在のDockerは一時override付きで起動中。frontendは`http://127.0.0.1:5173`、backendは`http://127.0.0.1:3000`、MySQLは`127.0.0.1:3306`。mainの追跡対象コードは変更していない。請求機能のローカルstack branchも削除していない。
