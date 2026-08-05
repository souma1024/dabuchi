# dabuchi

金融スマートフォンアプリケーションをチームで開発するためのモノレポです。

## 技術スタック

- Frontend: React / TypeScript / Vite
- Backend: Node.js / TypeScript / Express
- Database: MySQL 8.4 / Flyway
- Database access: MySQL2
- Test: Vitest / Testing Library / Supertest
- Quality: ESLint / Prettier / TypeScript
- CI: GitHub Actions

Viteは開発サーバーとビルドが軽量で、短期間のチーム開発でも扱いやすいため採用しています。バックエンドは、学習コストと情報量のバランスを考慮してExpressを採用しています。SSRや大規模なAPI基盤が必要になった場合は、フレームワークを再検討します。

## 必要な環境

- Node.js 22以上
- npm 11以上

## セットアップ

```bash
git clone https://github.com/souma1024/dabuchi.git
cd dabuchi
npm ci
cp .env.example .env
```

フロントエンドとバックエンドは、それぞれ別のターミナルで起動します。

```bash
npm run dev:frontend
```

```bash
npm run dev:backend
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`

バックエンドのポートは`PORT`環境変数で変更できます。秘密情報をリポジトリやログへ含めないでください。

ログイン機能を実装するまでは、`.env`の`MOCK_USER_ID`に設定した公開`user_id`を現在ユーザーとして扱います。mock認証は開発・テスト専用で、本番環境では起動を拒否します。

## データベース

MySQLはDocker、migrationはFlywayで管理します。

```bash
npm run db:up
npm run db:migrate
npm run db:seed
```

終了時はコンテナを停止します。通常の停止ではデータvolumeを保持します。

```bash
npm run db:down
```

### usersテーブル

| カラム      | 型              | 役割                                       |
| ----------- | --------------- | ------------------------------------------ |
| id          | BINARY(16)      | 内部主キー。MySQLがUUIDを自動生成          |
| user_id     | VARCHAR(64)     | 友達追加に利用する公開ID。重複不可         |
| balance     | BIGINT UNSIGNED | 円単位の残高。初期値0、負数不可            |
| user_name   | VARCHAR(100)    | 表示名                                     |
| profile_url | VARCHAR(255)    | `/assets/profiles/humanN.png`形式の画像URL |
| created_at  | DATETIME(6)     | 作成日時。MySQLが自動設定                  |

内部UUIDと公開用`user_id`は別の識別子です。APIでは内部UUIDを文字列へ変換して扱い、友達追加では一意な`user_id`を利用する想定です。

開発用シードは30ユーザーです。`human1.png`〜`human6.png`を循環して参照します。シードは本番migrationへ含めず、`npm run db:seed`を明示的に実行した場合だけ投入されます。

提供画像は再配布せず、各自のローカル環境で`frontend/public/assets/profiles/`へ配置してください。必要なファイル名と注意事項は[プロフィール画像の配置手順](frontend/public/assets/profiles/README.md)に記載しています。PNGファイルは`.gitignore`でGit管理から除外しています。

### migrationの追加

`database/migrations/`へ、`V2__説明.sql`のように連番のSQLを追加します。適用済みmigrationは書き換えず、新しいmigrationで変更してください。

破壊的なrollbackは自動実行しません。今回の手動rollback SQLは`database/rollback/V1__drop_users.sql`です。実行前にデータのバックアップと対象環境を確認してください。

### DBテスト

```bash
npm run db:test
```

テストは隔離された一時MySQLとvolumeを作成し、完了時に削除します。30件の開発用シードは投入せず、migration、UUID生成、公開IDの一意制約、残高制約だけを最小データで確認します。

候補一覧APIを利用するbackendも同じ`.env`のMySQL接続情報を参照します。`MYSQL_HOST`を省略した場合は`127.0.0.1`へ接続します。

## ディレクトリ構成

```text
.
├── .github/workflows/ci.yml
├── .github/workflows/database-ci.yml
├── compose.yaml
├── database/
│   ├── migrations/   # Flywayのversioned migration
│   ├── rollback/     # 手動rollback SQL
│   ├── scripts/      # 開発用DB操作
│   ├── seeds/        # 開発用シード
│   └── tests/        # migrationのDB統合テスト
├── frontend/
│   ├── public/
│   └── src/
│       ├── app/          # アプリ全体の組み立て
│       ├── components/   # 複数機能で共有する表示コンポーネント
│       ├── features/     # 機能単位のUI・状態・API連携
│       ├── hooks/        # 複数機能で共有するHooks
│       ├── lib/          # 外部サービスや汎用処理との境界
│       ├── styles/       # グローバルスタイル
│       ├── test/         # テスト共通設定
│       └── types/        # 複数機能で共有する型
├── backend/
│   └── src/
│       ├── domain/       # ビジネスルール
│       ├── application/  # ユースケース
│       ├── infrastructure/ # DB・外部APIなどの実装
│       └── presentation/ # HTTPの入出力
└── docs/
    ├── adr/
    └── reports/
```

機能固有のコードは`features`または各バックエンドレイヤーへ配置します。共有化は複数箇所で必要になってから行い、将来利用するかもしれないという理由だけで抽象化しません。

## API

### `GET /health`

認証不要の稼働確認用エンドポイントです。

```json
{
  "status": "ok"
}
```

- 成功: `200 OK`
- 未定義のパス: `404 Not Found` / `{ "error": "Not Found" }`

### `GET /api/users/:currentUserId/recipients`

自分以外の送る相手候補を、作成日時順に20件ずつ返します。次ページはレスポンスの`pageInfo.nextCursor`を`cursor` queryへ渡して取得します。

詳細なrequest / response / status codeは[送る相手候補一覧API](docs/api/user-recipients.md)を参照してください。

### `GET /api/me`

mockログイン中のユーザーについて、ホーム画面に必要な内部UUID、名前、プロフィール画像URL、残高を返します。

詳細なresponse / status codeは[Current user API](docs/api/current-user.md)を参照してください。

## 品質チェック

```bash
npm run format
npm run lint
npm run typecheck
npm test
npm run build
```

Pull RequestではGitHub Actionsが同じ検証を実行します。MySQLを起動する専用CIは、migration、DBテスト、Compose、DB workflowが変更された場合だけ実行されます。

## チーム開発

1. `main`を最新化する
2. 1つの目的に限定したブランチを作る
3. 実装とテストを同じ変更単位で追加する
4. 品質チェックを実行する
5. Draft Pull Requestを作り、レビュー可能になったらReadyへ変更する

ブランチ名の例: `feature/send-money-form`、`fix/validate-transfer-amount`

コミットメッセージはConventional Commitsを基本とします。

```text
feat(frontend): add transfer amount form
feat(backend): add create transfer usecase
test(backend): add transfer validation cases
```

## 設計記録と引き継ぎ

- [ADR 0001](docs/adr/0001-initialize-typescript-monorepo.md)
- [ADR 0002: MySQLとFlyway](docs/adr/0002-use-mysql-and-flyway.md)
- [ADR 0003: 候補一覧のカーソルページング](docs/adr/0003-use-cursor-pagination-for-user-recipients.md)
- [ADR 0004: ログイン実装までのmock user](docs/adr/0004-use-configured-mock-user-until-login.md)
- [TODO](docs/TODO.md)
- [作業報告書](docs/reports/2026-08-04-project-initialization-report.md)
- [users DB作業報告書](docs/reports/2026-08-04-users-database-report.md)
