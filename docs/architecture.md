# システム構成

このドキュメントは全体像を1枚で掴むためのものです。個々のAPIの仕様は[docs/api](api)、設計判断の経緯は[docs/adr](adr)を参照してください。

## 実行構成

`docker compose`で4つのサービスが動きます。frontendとbackendは同一オリジンで、ブラウザからのAPI呼び出しはVite dev serverの`/api`プロキシがbackendへ中継します。

```mermaid
flowchart LR
  browser["ブラウザ<br/>React SPA"]

  subgraph compose["docker compose"]
    frontend["frontend<br/>Vite dev server<br/>:5173"]
    backend["backend<br/>Express :3000"]
    mysql[("mysql<br/>MySQL 8.4")]
    migrate["migrate<br/>Flyway"]
  end

  browser -->|"HTML / JS"| frontend
  browser -->|"/api/* + Cookie"| frontend
  frontend -->|"proxy"| backend
  backend -->|"mysql2"| mysql
  migrate -->|"起動時にschemaを適用"| mysql
```

`migrate`はbackendより先に完了する依存にしてあり、schemaが揃う前にAPIが起動しません。

## backendのレイヤー

依存の向きは外側から内側への一方向です。`application`は`ports`（interface）ごしにDBを扱うため、MySQLを知りません。

```mermaid
flowchart TD
  presentation["presentation<br/>router・Cookie・エラー→status変換"]
  application["application<br/>usecase と ports"]
  domain["domain<br/>業務ルール（残高・パスワード・セッション）"]
  infrastructure["infrastructure<br/>MySQL実装"]

  presentation --> application
  application --> domain
  infrastructure -->|"portsを実装"| application
  infrastructure --> domain
```

`infrastructure`から`application`へ矢印が向くのは、実装側がinterfaceに従うためです。依存を逆転させることで、usecaseのテストがDBなしで書けます。

## データモデル

`password_hash`と`sessions`はログイン（#109〜#114）で入るもので、まだmainにはありません。

```mermaid
erDiagram
  users ||--o{ sessions : "ログイン中の端末"
  users ||--o{ transfers : "送る / 受け取る"
  users ||--o{ payment_requests : "請求する / される"
  users ||--o{ friendships : "友達になる"
  users ||--o{ user_blocks : "ブロックする"
  friendships ||--o{ friendship_notes : "自分用メモ"

  users {
    binary id PK "内部UUID。送金先の指定に使う"
    varchar user_id UK "公開ID。友達追加で相手に伝える"
    varchar password_hash "scrypt。未設定ならログイン不可"
    bigint balance "残高（円）"
  }
  sessions {
    binary token_hash PK "CookieのtokenのSHA-256"
    binary user_id FK
    datetime expires_at
  }
  transfers {
    bigint id PK
    binary sender_id FK
    binary recipient_id FK
    bigint amount
    varchar idempotency_key UK "再送で二重送金しないための鍵"
  }
  payment_requests {
    binary id PK
    binary requester_id FK
    binary recipient_id FK
    varchar status "pending / accepted / rejected"
    binary responded_by FK "応答した当事者"
  }
  friendships {
    binary id PK
    binary user1_id FK "user1_id < user2_id で重複を防ぐ"
    binary user2_id FK
  }
```

内部UUIDと公開`user_id`は別の識別子です。公開IDを送金先の指定に使わないことで、IDを知られても直接お金を動かせないようにしています。

## 画面とAPIの対応

```mermaid
flowchart LR
  login["/login・/signup"] --> auth["/api/auth"]
  home["/（ホーム）"] --> me["/api/me"]
  friends["/friends<br/>/friends/blocked"] --> friendsApi["/api/friends"]
  recipients["/recipients"] --> friendsApi
  transfer["/transfer"] --> transfersApi["/api/transfers"]
  billing["/billing"] --> requestsApi["/api/payment-requests"]
  requests["/payment-requests"] --> requestsApi
  history["/transactions"] --> transactionsApi["/api/transactions"]
```

送金・請求の相手候補は友達一覧から引くため、`/recipients`は`/api/friends`を使います。

## 認証

> ログイン（#109〜#114）はレビュー中で、まだmainへ入っていません。この節はマージ後の姿です。
> それまでは`MOCK_USER_ID`が指すユーザーを現在ユーザーとして扱います（[ADR 0004](adr/0004-use-configured-mock-user-until-login.md)）。

セッションはserver側の`sessions`テーブルで持ち、CookieにはtokenだけをHttpOnlyで渡します。DBにはtokenのハッシュしか置きません。

```mermaid
sequenceDiagram
  participant B as ブラウザ
  participant A as backend
  participant D as MySQL

  B->>A: POST /api/auth/login（user_id・パスワード）
  A->>D: password_hashを引いてscryptで検証
  A->>D: sessions へ token のハッシュを保存
  A-->>B: Set-Cookie（HttpOnly・SameSite=Lax・7日）

  B->>A: GET /api/me（Cookie）
  A->>D: token のハッシュでセッションを引く
  A-->>B: 現在ユーザー

  Note over B,A: セッションが無ければ /health と /api/auth/* 以外は 401
```

## お金が動く処理

送金と請求の承認は、残高更新と履歴記録を**単一のトランザクション**で行います。残高移動そのものは`applyMoneyTransfer`に集約し、送金APIと請求承認の双方から呼びます。

```mermaid
flowchart TD
  start["送金 / 請求の承認"] --> lock["対象行を FOR UPDATE でロック"]
  lock --> check["残高と当事者を検証"]
  check -->|"不足"| rollback["rollback → 422"]
  check -->|"OK"| move["支払人を減算・受取人を加算"]
  move --> record["transfers へ記録"]
  record --> commit["commit"]
```

検証と更新の間に別の実行が割り込むと二重送金になるため、確認はトランザクションの内側で行います。送金は`Idempotency-Key`、請求の承認は同じ向きの再送を冪等にすることで、応答が届かなかったときの再送でも結果が二重にならないようにしています。
