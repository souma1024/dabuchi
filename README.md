# dabuchi

金融スマートフォンアプリケーションをチームで開発するためのモノレポです。

## 技術スタック

- Frontend: React / TypeScript / Vite
- Backend: Node.js / TypeScript / Express
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

## ディレクトリ構成

```text
.
├── .github/workflows/ci.yml
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

## 品質チェック

```bash
npm run format
npm run lint
npm run typecheck
npm test
npm run build
```

Pull RequestではGitHub Actionsが同じ検証を実行します。

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
- [TODO](docs/TODO.md)
- [作業報告書](docs/reports/2026-08-04-project-initialization-report.md)
