# Current user API

ホーム画面に表示する現在ユーザーを返すAPIです。現在ユーザーはセッションから決まります。

## Endpoint

```http
GET /api/me
```

request body、path parameter、query parameterはありません。

## Response

### `200 OK`

```json
{
  "user": {
    "id": "5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001",
    "userId": "friend-001",
    "name": "山田 太郎",
    "profileUrl": "/assets/profiles/human1.png",
    "balance": 120000
  }
}
```

| フィールド        | 型     | 説明                           |
| ----------------- | ------ | ------------------------------ |
| `user.id`         | string | 画面遷移などに使う内部UUID     |
| `user.userId`     | string | 友達追加で相手へ伝える公開ID   |
| `user.name`       | string | `users.user_name`              |
| `user.profileUrl` | string | `users.profile_url`            |
| `user.balance`    | number | 円単位の非負整数で表す現在残高 |

### `404 Not Found`

セッションが指すユーザーが削除された場合などです。有効なセッションが無い場合は`401 NOT_AUTHENTICATED`になります。

```json
{
  "error": {
    "code": "CURRENT_USER_NOT_FOUND",
    "message": "Current user was not found."
  }
}
```

### `500 Internal Server Error`

DB接続失敗などの想定外エラーです。内部エラーの詳細はレスポンスへ含めません。

## Mock authentication

```env
NODE_ENV=development
```

mock認証は開発・テスト専用です。`NODE_ENV`が`development`または`test`以外の場合はbackend起動時に拒否します。ログイン実装時はHTTP層から認証済みの公開ユーザーIDをusecaseへ渡す方式に置き換えます。
