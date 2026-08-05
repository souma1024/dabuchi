# 取引履歴一覧API

## 目的

取引履歴画面に、指定ユーザーの取引を作成日時の降順で20件ずつ返す。`transfers`テーブルの送受金を統合し、現在ユーザーから見た「相手」を算出して返す。カーソルページングは[送る相手候補一覧API](user-recipients.md)を踏襲する。

## Endpoint

```http
GET /api/users/:currentUserId/transactions?cursor=<opaque cursor>
```

- `currentUserId`: `users.id`の内部UUID。友達追加に使う公開`user_id`ではない
- `cursor`: 次ページ取得時だけ指定する不透明な文字列
- 取得件数: 20件固定
- 並び順: `created_at`降順、`transfers.id`降順（新しい取引が先頭）
- `direction`: 現在ユーザーが送信者なら`sent`（相手 = 受取人）、受取人なら`received`（相手 = 送信者）

認証が未実装のため、現時点では現在ユーザーの内部UUIDをパスで受け取る。認証導入後は、認証情報から現在ユーザーを特定するAPIへ変更する。

## Response

### `200 OK`

```json
{
  "transactions": [
    {
      "id": "1024",
      "counterparty": {
        "id": "0198fb84-b222-7abc-8def-0123456789ab",
        "name": "山田 太郎",
        "profileUrl": "/assets/profiles/human1.png"
      },
      "amount": 1200,
      "direction": "sent",
      "createdAt": "2026-08-05T01:00:00.000Z"
    }
  ],
  "pageInfo": {
    "nextCursor": "eyJjcmVhdGVkQXQiOi...",
    "hasNextPage": true
  }
}
```

`hasNextPage`が`true`なら、次回リクエストの`cursor`へ`nextCursor`をそのまま渡す。最終ページでは`nextCursor`は`null`になる。

### フィールド

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `id` | string | 取引ID。`transfers.id`(BIGINT)を文字列で返す |
| `counterparty.id` | string | 相手ユーザーの内部UUID |
| `counterparty.name` | string | 相手の表示名 |
| `counterparty.profileUrl` | string | 相手のプロフィール画像URL |
| `amount` | number | 金額（正の整数・円） |
| `direction` | `"sent"` \| `"received"` | 送金 / 受取の区別 |
| `createdAt` | string | 取引日時（ISO 8601・UTC） |
| `pageInfo.nextCursor` | string \| null | 次ページ取得用カーソル。最終ページは`null` |
| `pageInfo.hasNextPage` | boolean | 次ページの有無 |

フロントエンド側では、`id`はBIGINTの文字列なので`Number()`で数値化しない（桁溢れの恐れ）。`createdAt`はISO 8601（UTC）なので`new Date(createdAt)`で整形できる。`counterparty.profileUrl`は`UserAvatar`の`iconSrc`に対応させる。

### Error responses

- `400 INVALID_REQUEST`: 内部UUIDまたはカーソルが不正
- `404 CURRENT_USER_NOT_FOUND`: 現在ユーザーが存在しない
- `500 INTERNAL_SERVER_ERROR`: DB障害などの想定外エラー。内部詳細はレスポンスに含めない
