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

1. Starterプランのクラスタを作る
2. **Connect**から接続情報（host / port / user / password）を控える。portは`4000`。
   passwordは発行時に1度しか表示されない
3. データベースとCHECK制約を用意する

```sql
CREATE DATABASE dabuchi CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
-- TiDBは既定でCHECK制約を無視する。付けたつもりの不変条件がDBで効かなくなるため有効にする。
SET GLOBAL tidb_enable_check_constraint = ON;
```

## 2. マイグレーション

Flywayをローカルから実行する。TiDBはTLS必須。

```bash
docker run --rm -v "$(pwd)/database/migrations:/flyway/sql" \
  -e FLYWAY_PASSWORD='<password>' flyway/flyway:13.1.0 \
  -url="jdbc:mysql://<host>:4000/dabuchi?useSsl=true&sslMode=verify-full" \
  -user='<user>' migrate
```

`useSsl=true`は省略できない。Flywayが使うMariaDBドライバは`sslMode`だけでは平文で接続し、
TiDBに`Connections using insecure transport are prohibited`で拒否される。

シード（`database/seeds/development.sql`）を入れると、30ユーザー全員が共通パスワード
`dabuchi-dev`でログインできる状態になる。デモとして意図的に入れる場合を除き、投入しない。

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
