# Payment requests API

複数の被請求者へ、被請求者ごとの金額で請求を作成するAPIです。請求者はrequest bodyから受け取らず、backendのcurrent userから決定します。

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
