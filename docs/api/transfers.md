# 送金API

## 目的

送金者から受取人へ金額を移動する。送金の完了時に、送金者・受取人双方の残高へ原子的に反映し、取引履歴（`transfers`）へ記録する。

## Endpoint

```http
POST /api/transfers
Content-Type: application/json
Idempotency-Key: <クライアント生成の一意なキー>
```

- `Idempotency-Key`（必須）: 送金1件ごとにクライアントが生成する一意な文字列（64文字以内）。ネットワーク再送・ダブルクリック・リトライでの二重送金を防ぐ。同一キーの再送は最初の1件だけを実行し、以降は同じ結果を返す。
- `senderId` / `recipientId`: `users.id`をUUID文字列へ変換した内部UUID。
- `amount`: 円単位の正の整数（安全な整数の範囲）。

```json
{
  "senderId": "5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001",
  "recipientId": "5e5a4a1e-3b42-4f47-8b1f-b77ef98bf002",
  "amount": 1500
}
```

送金者・受取人・履歴の更新は単一のトランザクションで行う。残高不足時は一切変更せずロールバックする。

## Response

### `201 Created`

```json
{
  "id": 1,
  "senderId": "5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001",
  "recipientId": "5e5a4a1e-3b42-4f47-8b1f-b77ef98bf002",
  "amount": 1500
}
```

`id`は作成された`transfers`レコードの識別子。同一`Idempotency-Key`での再送は、最初の送金と同じ`201`結果を返す（残高は二重に動かさない）。

### Error responses

- `400 INVALID_REQUEST`: 入力不正、または`Idempotency-Key`ヘッダの欠落・空・64文字超
- `409 IDEMPOTENCY_KEY_CONFLICT`: 同一`Idempotency-Key`が、`senderId`/`recipientId`/`amount`の異なる送金に再利用された
- `422 TRANSFER_PARTICIPANT_NOT_FOUND`: 送金者または受取人が存在しない
- `422 INSUFFICIENT_BALANCE`: 送金者の残高が不足している
- `500 INTERNAL_SERVER_ERROR`: DB障害などの想定外エラー。内部詳細はレスポンスに含めない
