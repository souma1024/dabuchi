# デプロイ手順

`dev`ブランチをRenderの1サービスとして動かし、DBはTiDB Cloud Serverlessを使う。

## 構成

```
ブラウザ ──HTTPS──▶ Render（Express）
                      ├─ /api/*     … API
                      ├─ それ以外   … ビルド済みSPA
                      └─ mysql2 + TLS ──▶ TiDB Cloud Serverless
```

**フロントとAPIを同じオリジンから配信する。** 別オリジンにするとセッションCookieを
`SameSite=None`へ緩めCORSも要る。守る対象が増えるため、経路を分けない。

## 1. TiDB Cloud

1. Serverlessのクラスタを作る
2. 接続情報（host / port / user / password）を控える。portは`4000`
3. データベースを作る（例: `dabuchi`）

```sql
CREATE DATABASE dabuchi CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
```

## 2. マイグレーション

Flywayをローカルから実行する。TiDBはTLS必須。

```bash
docker run --rm -v "$(pwd)/database/migrations:/flyway/sql" flyway/flyway:13.1.0 \
  -url="jdbc:mysql://<host>:4000/dabuchi?sslMode=VERIFY_IDENTITY" \
  -user=<user> -password=<password> migrate
```

シード（`database/seeds/development.sql`）は**投入しない**。全ユーザーが共通パスワードのため、
公開環境へ入れると誰でもログインできてしまう。動作確認用のアカウントは新規登録で作る。

## 3. Render

1. New → Web Service → このリポジトリを選ぶ
2. Branch: `dev` / Runtime: Docker（`render.yaml`があれば自動で読む）
3. 環境変数を設定する

| 変数             | 値             |
| ---------------- | -------------- |
| `NODE_ENV`       | `production`   |
| `MYSQL_SSL`      | `true`         |
| `MYSQL_HOST`     | TiDBのhost     |
| `MYSQL_PORT`     | `4000`         |
| `MYSQL_DATABASE` | `dabuchi`      |
| `MYSQL_USER`     | TiDBのuser     |
| `MYSQL_PASSWORD` | TiDBのpassword |

`PORT`はRenderが渡すため設定しない。

## 4. 確認

```bash
curl -i https://<render-url>/health          # 200
curl -i https://<render-url>/api/me          # 401（未ログイン）
```

画面を開いて新規登録し、ログインできれば完了。

## 注意

- `NODE_ENV=production`ではセッションCookieに`Secure`が付く。HTTPSでのみ動く（RenderはHTTPS）
- 無料プランはアクセスが無いとスリープする。初回アクセスに数十秒かかる
- 残高が動く操作はトランザクションで守っているが、無料プランの接続数上限に注意する
