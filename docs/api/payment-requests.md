# Payment requests API

複数の被請求者へ、被請求者ごとの金額で請求を作成するAPIです。請求者はrequest bodyから受け取らず、backendのcurrent userから決定します。

# 請求の作成

## Endpoint

```http
POST /api/payment-requests
Content-Type: application/json
```

## Request

```json
{
  "requests": [
    {
      "recipientId": "5e5a4a1e-3b42-4f47-8b1f-b77ef98bf002",
      "amount": 1500
    },
    {
      "recipientId": "5e5a4a1e-3b42-4f47-8b1f-b77ef98bf003",
      "amount": 2800
    }
  ]
}
```

| フィールド               | 型     | 制約                                                                                     |
| ------------------------ | ------ | ---------------------------------------------------------------------------------------- |
| `requests`               | array  | 1件以上50件以下                                                                          |
| `requests[].recipientId` | string | 内部UUID。配列内で重複不可                                                               |
| `requests[].amount`      | number | 円単位の正の安全な整数。1件につき80,000円まで（80,001円以上は`400`）。被請求者ごとに指定 |

候補表示には既存の`GET /api/users/:currentUserId/recipients`を利用します。frontendのオートフィルは入力補助であり、backendへは最終的な個別金額を送ります。

`requesterId`をrequest bodyへ含めても請求者の決定には使用しません。請求者はセッションから解決したcurrent userです。

## Response

### `201 Created`

```json
{
  "requests": [
    {
      "id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "requesterId": "5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001",
      "recipientId": "5e5a4a1e-3b42-4f47-8b1f-b77ef98bf002",
      "amount": 1500,
      "status": "pending"
    }
  ]
}
```

請求作成時点では残高を移動せず、すべて`pending`で保存します。将来、被請求者が承認したときに残高更新・送金履歴作成・請求状態更新を同一DB transactionで実行します。

### `400 Bad Request`

配列件数、UUID、金額（80,000円超を含む）、重複、自分自身への請求が不正な場合です。

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "requests must contain at least one item."
  }
}
```

### `404 Not Found`

設定されたmock current userが存在しない場合です。

```json
{
  "error": {
    "code": "CURRENT_USER_NOT_FOUND",
    "message": "Current user was not found."
  }
}
```

### `422 Unprocessable Entity`

被請求者のいずれかが存在しない場合です。複数行は一つのINSERTで保存するため、一部だけが保存されることはありません。

```json
{
  "error": {
    "code": "PAYMENT_REQUEST_PARTICIPANT_NOT_FOUND",
    "message": "One or more recipients were not found."
  }
}
```

### `500 Internal Server Error`

DB接続失敗などの想定外エラーです。内部エラーの詳細はレスポンスへ含めません。

# 請求の一覧取得

自分が請求された（`received`）／自分が請求した（`sent`）請求を、作成日時の降順で20件ずつ返します。カーソルページングは[送る相手候補一覧API](user-recipients.md)を踏襲します。

## Endpoint

```http
GET /api/payment-requests?direction=received&status=pending&cursor=<opaque cursor>
```

| クエリ      | 必須 | 内容                                                      |
| ----------- | ---- | --------------------------------------------------------- |
| `direction` | 必須 | `received`（自分が請求された） / `sent`（自分が請求した） |
| `status`    | 任意 | `pending` / `accepted` / `rejected`。省略時は全件         |
| `cursor`    | 任意 | 次ページ取得時だけ指定する不透明な文字列                  |

- 取得件数: 20件固定
- 並び順: `created_at` 降順、`payment_requests.id` 降順（新しい請求が先頭）
- 現在ユーザーは request から受け取らず、`POST /api/payment-requests` と同じくbackendのcurrent userから決定します

`direction=received` では `recipient_id`、`sent` では `requester_id` が現在ユーザーの行を返します。`counterparty` はその逆側のユーザーです。

## Response

### `200 OK`

```json
{
  "requests": [
    {
      "id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "counterparty": {
        "id": "5e5a4a1e-3b42-4f47-8b1f-b77ef98bf002",
        "name": "佐藤 花子",
        "profileUrl": "/assets/profiles/human2.png"
      },
      "amount": 3000,
      "status": "pending",
      "createdAt": "2026-08-03T01:00:00.000Z",
      "respondedAt": null
    }
  ],
  "pageInfo": {
    "nextCursor": "eyJjcmVhdGVkQXQiOi...",
    "hasNextPage": true
  }
}
```

`hasNextPage` が `true` なら、次回リクエストの `cursor` へ `nextCursor` をそのまま渡します。最終ページでは `nextCursor` は `null` になります。

**カーソルは、それを得たときと同じ `direction`・`status` に対してのみ再利用できます。** カーソルは `created_at` と `id` だけを持ち、検索条件を含みません。タブ切り替えなどで `direction` や `status` を変えるときは、カーソルを破棄して1ページ目から取得してください。条件をまたいで渡しても他のユーザーの請求が見えることはありませんが、返る範囲が期待とずれます。

`createdAt` は請求日として表示に利用します。`respondedAt` は決着した日時で、`pending` のあいだは `null` です。

### `status` の意味

| 値         | 意味                         |
| ---------- | ---------------------------- |
| `pending`  | まだ決着していない           |
| `accepted` | 被請求者が承認し、送金された |
| `rejected` | 成立しなかった               |

`rejected` は「被請求者が拒否した」と「請求者が取り消した」の**両方**を表します。`payment_requests.status` のCHECK制約を変えずに取り消しを扱うためです。どちらの操作だったかは `payment_requests.responded_by` に記録されますが、**一覧のレスポンスには含めていません。** 画面のラベルも行為者を示さない「キャンセル」とします。

### `400 Bad Request`

`direction` が未指定または不正、`status` が不正、`cursor` が復号できない場合です。

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "direction must be \"received\" or \"sent\""
  }
}
```

### `404 Not Found`

現在ユーザーが `users` に存在しない場合です。

```json
{
  "error": {
    "code": "CURRENT_USER_NOT_FOUND",
    "message": "Current user was not found."
  }
}
```

# 請求1件の取得

請求を1件だけ返します。一覧の要素とまったく同じ形です。

## Endpoint

```http
GET /api/payment-requests/:id
```

- `:id` は `payment_requests.id` の内部UUID
- 取得できるのは**当事者（請求者または被請求者）だけ**です
- `counterparty` は現在ユーザーでない側です。`direction` は受け取りません

確認画面を開いた時点の状態を取り直す用途です（Issue #61）。一覧を読み込んだ時刻と行をタップする時刻の間に状態が変わりうるため、古い情報のまま承認ボタンを出さないようにします。

一覧APIで代用しない理由は、20件ずつのページングでは古い請求へ到達できないためです。

## Response

### `200 OK`

```json
{
  "request": {
    "id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "counterparty": {
      "id": "5e5a4a1e-3b42-4f47-8b1f-b77ef98bf002",
      "name": "佐藤 花子",
      "profileUrl": "/assets/profiles/human2.png"
    },
    "amount": 3000,
    "status": "pending",
    "createdAt": "2026-08-03T01:00:00.000Z",
    "respondedAt": null
  }
}
```

### エラー

| status | code                        | 条件                                                   |
| ------ | --------------------------- | ------------------------------------------------------ |
| `400`  | `INVALID_REQUEST`           | `:id` がUUIDでない                                     |
| `404`  | `PAYMENT_REQUEST_NOT_FOUND` | 請求が存在しない、**または現在ユーザーが当事者でない** |
| `404`  | `CURRENT_USER_NOT_FOUND`    | 現在ユーザーが `users` に存在しない                    |

**当事者でない場合も `404` です。** 承認・拒否が `403` を返すのと異なります。読み取りでは「存在するが読めない」と「存在しない」を区別せず、他人の請求IDを当てられても存在を確認できないようにしています。当事者かどうかの判定はSQLの検索条件に含めており、アプリケーション側で弾いているのではありません。

# 請求の承認・拒否・取り消し

`pending` の請求を終わらせます。承認すると残高が動き、取引履歴にも記録されます。

## Endpoint

```http
POST /api/payment-requests/:id/accept
POST /api/payment-requests/:id/reject
POST /api/payment-requests/:id/cancel
```

- `:id` は `payment_requests.id` の内部UUID
- request body はありません
- 現在ユーザーは request から受け取らず、backendのcurrent userから決定します

3つは同じ手続きで、**実行できる当事者・遷移先・残高が動くかだけ**が違います。

| 操作     | 実行できる人 | 結果の `status` | `responded_by` | 残高     |
| -------- | ------------ | --------------- | -------------- | -------- |
| `accept` | 被請求者     | `accepted`      | 被請求者       | 動く     |
| `reject` | 被請求者     | `rejected`      | 被請求者       | 動かない |
| `cancel` | **請求者**   | `rejected`      | **請求者**     | 動かない |

実行できる当事者でない場合は `403` です。経路を分けているのは、URLに動詞を出して意図を明示するためです。

### 取り消しと拒否はDB上どちらも `rejected` です

`payment_requests.status` のCHECK制約を変えずに取り消しを扱うため、`rejected` が「被請求者の拒否」と「請求者の取り消し」の両方を表します。**どちらの操作だったかは `payment_requests.responded_by` で区別します。**

`status` に `canceled` を足す案より影響が小さく、後から区別できなくなる事態も避けられます。画面のラベルは行為者を示さない「キャンセル」で統一します。

## 承認 `POST /:id/accept`

以下を**単一のDB transaction**で実行します。

1. 対象の請求行を `FOR UPDATE` でロックする
2. 対象が `pending` か、現在ユーザーが被請求者かを確認する
3. 被請求者の残高を `amount` 減らし、請求者の残高を `amount` 増やす
4. `transfers` に1件記録する（取引履歴に表示されるようにする）
5. `status='accepted'`、`responded_at=CURRENT_TIMESTAMP(6)` に更新する

3〜4は送金API（[docs/api/transfers.md](transfers.md)）と同じ手続きを再利用しています。途中で失敗した場合は全体が巻き戻り、残高だけが動いた状態にはなりません。

状態の確認と更新の間に別の実行が割り込むと二重送金になるため、確認から更新までを同じtransactionの内側で行っています。

### `200 OK`

```json
{
  "request": {
    "id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "amount": 3000,
    "status": "accepted",
    "respondedAt": "2026-08-06T02:00:00.000Z"
  },
  "balance": 117000
}
```

`balance` は送金後の被請求者の残高です。画面側が `GET /api/me` を取り直さずに完了表示を出せます。

## 拒否 `POST /:id/reject` ・ 取り消し `POST /:id/cancel`

1. 対象が `pending` か、実行できる当事者本人かを確認する
2. `status='rejected'`、`responded_at=CURRENT_TIMESTAMP(6)`、`responded_by=操作者` に更新する

**残高は動きません。そのため `balance` は返しません。** 拒否は被請求者、取り消しは請求者が実行します。レスポンスの形は同一で、`status` はどちらも `rejected` です。

### `200 OK`

```json
{
  "request": {
    "id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "amount": 3000,
    "status": "rejected",
    "respondedAt": "2026-08-06T02:00:00.000Z"
  }
}
```

## エラー

| status | code                                | 条件                                     |
| ------ | ----------------------------------- | ---------------------------------------- |
| `400`  | `INVALID_REQUEST`                   | `:id` がUUIDでない                       |
| `403`  | `PAYMENT_REQUEST_FORBIDDEN`         | その操作を実行できる当事者でない         |
| `404`  | `PAYMENT_REQUEST_NOT_FOUND`         | 対象の請求が存在しない                   |
| `404`  | `CURRENT_USER_NOT_FOUND`            | 現在ユーザーが `users` に存在しない      |
| `409`  | `PAYMENT_REQUEST_ALREADY_RESPONDED` | 決着済みで、今回の操作を再送とみなせない |
| `422`  | `INSUFFICIENT_BALANCE`              | 被請求者の残高が不足している（承認のみ） |

**`409` は画面側の制御だけでは防げません。** 一覧を読み込んだ後に別端末で処理される、といったことが起こりえます。二重送金を防ぐのはserver側の責務です。

### 自分が同じ操作で終わらせた請求への再送は冪等です

**すでに自分が `accept` した請求へ再度 `accept` すると、`409` ではなく `200` を返します。** 残高は動かさず、確定済みの結果をそのまま返します。`reject` と `cancel` も同じです。

DBのCOMMITは完了したのに応答がclientへ届かない、ということが起こりえます。このとき `409` を返すと、「失敗表示なのにお金は動いている」状態から抜け出せません。再送を冪等にすることで、再送すれば必ず正しい結果へ収束します。

**判定には `responded_by` を使い、遷移先が一致するだけでは冪等とみなしません。** 拒否も取り消しも `rejected` になるため、状態だけを見ると区別できないからです。

| 確定済みの状態           | 今回の操作          | 結果                  |
| ------------------------ | ------------------- | --------------------- |
| 自分が `accept` した     | `accept`            | `200`（冪等リプレイ） |
| 自分が `reject` した     | `reject`            | `200`（冪等リプレイ） |
| 自分が `cancel` した     | `cancel`            | `200`（冪等リプレイ） |
| 請求者が `cancel` した   | 被請求者の `reject` | **`409`**             |
| 被請求者が `reject` した | 請求者の `cancel`   | **`409`**             |
| `accept` 済み            | `reject` / `cancel` | `409`                 |

請求者が取り消した請求へ被請求者が `reject` して `200` が返ると、画面に「請求を拒否しました」と誤って表示されます。**終わらせた本人かどうかまで確認**しているのはこのためです。

`responded_by` が `NULL` の行（列の追加から取り消しAPI導入までの間に確定した行）は、**被請求者が終わらせたものとして扱います。** その期間に請求を終わらせられたのは被請求者だけだからです。

冪等リプレイで返す `balance` は**現時点の残高**で、承認した瞬間の残高とは限りません。その後に別の送金があれば変わります。画面が必要とするのは最新の残高なので、これで問題ありません。

存在しない請求（`404`）と当事者でない請求（`403`）を区別しています。請求IDは当事者へAPIで渡しており、当てずっぽうで到達できるものではないためです。

**残高不足は `422` です。** Issue #71 の記載は `400` ですが、送金API（`POST /api/transfers`）が同じ条件で `422 INSUFFICIENT_BALANCE` を返しており、同一のエラー型を再利用しています。形式は正しいが状態のせいで処理できない、という意味でも `422` が適切です。

## 補足

`responded_at` は列名のうえでは「被請求者が応答した日時」ですが、取り消しでは請求者の操作時刻が入ります。`responded_by` と合わせて「誰がいつ請求を終わらせたか」として読んでください。

一覧（`GET /api/payment-requests`）と1件取得（`GET /api/payment-requests/:id`）のレスポンスには `responded_by` を含めていません。画面のラベルを行為者で出し分ける必要が出た段階で追加を検討します。
