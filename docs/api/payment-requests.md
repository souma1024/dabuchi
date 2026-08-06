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

| フィールド               | 型     | 制約                                       |
| ------------------------ | ------ | ------------------------------------------ |
| `requests`               | array  | 1件以上50件以下                            |
| `requests[].recipientId` | string | 内部UUID。配列内で重複不可                 |
| `requests[].amount`      | number | 円単位の正の安全な整数。被請求者ごとに指定 |

候補表示には既存の`GET /api/users/:currentUserId/recipients`を利用します。frontendのオートフィルは入力補助であり、backendへは最終的な個別金額を送ります。

`requesterId`をrequest bodyへ含めても請求者の決定には使用しません。ログイン実装までは、開発環境の`MOCK_USER_ID`から解決したcurrent userが請求者です。

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

配列件数、UUID、金額、重複、自分自身への請求が不正な場合です。

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

`createdAt` は請求日として表示に利用します。`respondedAt` は承認・拒否された日時で、`pending` のあいだは `null` です。

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
