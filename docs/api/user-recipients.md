# 送る相手候補一覧API

## 目的

送金金額入力画面へ遷移する前のユーザー選択画面に、自分以外のユーザーを20件ずつ返す。

## Endpoint

```http
GET /api/users/:currentUserId/recipients?cursor=<opaque cursor>
```

- `currentUserId`: `users.id`の内部UUID。友達追加に使う公開`user_id`ではない
- `cursor`: 次ページ取得時だけ指定する不透明な文字列
- 取得件数: 20件固定
- 並び順: `created_at`、内部UUIDの昇順
- 除外条件: `currentUserId`と同じユーザー

認証が未実装のため、現時点では現在ユーザーの内部UUIDをパスで受け取る。認証導入後は、認証情報から現在ユーザーを特定するAPIへ変更する。

## Response

### `200 OK`

```json
{
  "users": [
    {
      "id": "0198fb84-a111-7abc-8def-0123456789ab",
      "name": "山田 太郎",
      "profileUrl": "/assets/profiles/human1.png"
    }
  ],
  "pageInfo": {
    "nextCursor": "eyJjcmVhdGVkQXQiOi...",
    "hasNextPage": true
  }
}
```

`hasNextPage`が`true`なら、次回リクエストの`cursor`へ`nextCursor`をそのまま渡す。最終ページでは`nextCursor`は`null`になる。

PR #2の送金金額入力画面へは、選択したユーザーの`id`、`name`、`profileUrl`を渡す。フロントエンド側の`iconSrc`には`profileUrl`を対応させる。残高と公開`user_id`は候補一覧では返さない。

### Error responses

- `400 INVALID_REQUEST`: 内部UUIDまたはカーソルが不正
- `404 CURRENT_USER_NOT_FOUND`: 現在ユーザーが存在しない
- `500 INTERNAL_SERVER_ERROR`: DB障害などの想定外エラー。内部詳細はレスポンスに含めない
