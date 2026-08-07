# 友達API

## 目的

友達の一覧・詳細・追加、自分用メモ、ブロックの操作をまとめて提供する。送金・請求の相手候補もこの友達一覧から引く。

現在ユーザーはセッションが示す公開`user_id`から特定し、server側で内部UUIDへ解決する。そのため、どのエンドポイントもURLにユーザーを含めない。

## Endpoints

| Method   | Path                         | 用途                 |
| -------- | ---------------------------- | -------------------- |
| `GET`    | `/api/friends`               | 友達一覧（20件ずつ） |
| `GET`    | `/api/friends/blocked`       | ブロック中の友達一覧 |
| `GET`    | `/api/friends/:friendshipId` | 友達詳細             |
| `POST`   | `/api/friends`               | 友達追加             |
| `POST`   | `/api/friends/:id/note`      | 自分用メモの作成     |
| `PUT`    | `/api/friends/:id/note`      | 自分用メモの更新     |
| `DELETE` | `/api/friends/:id/note`      | 自分用メモの削除     |
| `POST`   | `/api/friends/:id/block`     | ブロック             |
| `DELETE` | `/api/friends/:id/block`     | ブロック解除         |

`:friendshipId`は`friendships.id`のUUID。相手ユーザーの内部UUIDではない。

## 友達一覧

```http
GET /api/friends?sort=created-asc|created-desc&cursor=<opaque cursor>
```

- 取得件数: 20件固定
- `sort`:
  - `created-asc`: `friendships.created_at`、`friendships.id`の昇順
  - `created-desc`: `friendships.created_at`、`friendships.id`の降順
- `sort`省略時: `created-asc`
- 除外条件: 自分がブロックした相手、自分をブロックした相手
- 次ページ取得時も、`nextCursor`を受け取ったときの`sort`と同じ値を指定する
- `cursor`内の`sort`とクエリの`sort`が不一致な場合は`400 INVALID_REQUEST`

### `200 OK`

```json
{
  "friends": [
    {
      "friendshipId": "7f000000-0000-4000-8000-000000000002",
      "friend": {
        "id": "5e5a4a1e-3b42-4f47-8b1f-b77ef98bf002",
        "userId": "friend-002",
        "name": "佐藤 花子",
        "profileUrl": "/assets/profiles/human2.png"
      },
      "addedBy": {
        "id": "5e5a4a1e-3b42-4f47-8b1f-b77ef98bf001",
        "userId": "friend-001",
        "name": "山田 太郎",
        "profileUrl": "/assets/profiles/human1.png"
      },
      "addedAt": "2026-08-06T09:00:00.000Z",
      "note": "大学の友人"
    }
  ],
  "pageInfo": {
    "nextCursor": "eyJjcmVhdGVkQXQiOi...",
    "hasNextPage": true
  }
}
```

日時はISO 8601（UTC）。`cursor`は`sort`を含む不透明な文字列で、`hasNextPage`が`true`のときだけ次回リクエストへそのまま渡す。

`friend.id`は送金・請求の相手指定に使う内部UUID、`friend.userId`は友達追加に使う公開IDで、表示にも使える。`note`は現在ユーザーが書いた自分用メモで、未設定なら`null`。

## ブロック中の友達一覧

```http
GET /api/friends/blocked?cursor=<opaque cursor>
```

友達一覧と同じ形に`blockedAt`（ISO 8601）が加わる。並び順は`user_blocks.created_at`、`friendships.id`の昇順。自分がブロックした相手だけを返す。

## 友達詳細

```http
GET /api/friends/:friendshipId
```

### `200 OK`

```json
{
  "friend": {
    "friendshipId": "7f000000-0000-4000-8000-000000000002",
    "friend": {
      "id": "...",
      "userId": "friend-002",
      "name": "佐藤 花子",
      "profileUrl": "..."
    },
    "addedBy": {
      "id": "...",
      "userId": "friend-001",
      "name": "山田 太郎",
      "profileUrl": "..."
    },
    "addedAt": "2026-08-06T09:00:00.000Z",
    "note": "大学の友人"
  }
}
```

自分がブロックした相手の詳細は返す（解除導線のため）。相手からブロックされている場合は、存在しない場合と区別せず`404 FRIENDSHIP_NOT_FOUND`にする。

## 友達追加

```http
POST /api/friends
{ "friendUserId": "friend-002", "note": "大学の友人" }
```

`friendUserId`は相手の公開`user_id`。`note`は任意で、省略・`null`ならメモなし。成功時は`201 Created`で、作成した友達関係を友達詳細と同じ形（`friendship`キー）で返す。

## 自分用メモ

```http
POST /api/friends/:friendshipId/note
PUT  /api/friends/:friendshipId/note
{ "message": "大学の友人" }
```

作成は`201 Created`、更新は`200 OK`。`PUT`に空白だけの`message`を渡した場合はメモを削除し、`{ "note": null }`を返す。`DELETE`は冪等で、メモが無くても`204 No Content`を返す。

```json
{
  "note": {
    "friendshipId": "7f000000-0000-4000-8000-000000000002",
    "message": "大学の友人",
    "createdAt": "2026-08-06T09:30:00.000Z",
    "updatedAt": "2026-08-06T09:30:00.000Z"
  }
}
```

メモは書いた本人にしか見えないため、書き込んだユーザーの内部IDはレスポンスに含めない。

## ブロック・解除

```http
POST   /api/friends/:friendshipId/block
DELETE /api/friends/:friendshipId/block
```

ブロックは`200 OK`、解除は`204 No Content`。どちらも冪等で、すでに同じ状態でも成功する。ブロック中の相手は友達一覧・送金・請求の候補から外れる。

## Error responses

エラーは全エンドポイント共通で`{ "error": { "code": ..., "message": ... } }`を返す。

- `400 INVALID_REQUEST`: `friendshipId`やカーソル、`friendUserId`、メモ本文が不正
- `404 CURRENT_USER_NOT_FOUND`: 現在ユーザーが存在しない
- `404 FRIEND_USER_NOT_FOUND`: 追加しようとした相手が存在しない
- `404 FRIENDSHIP_NOT_FOUND`: 友達関係が存在しない、または相手からブロックされている
- `404 FRIENDSHIP_NOTE_NOT_FOUND`: 更新対象のメモが存在しない
- `409 FRIENDSHIP_ALREADY_EXISTS`: すでに友達
- `409 FRIENDSHIP_NOTE_ALREADY_EXISTS`: すでにメモがある
- `500 INTERNAL_SERVER_ERROR`: DB障害などの想定外エラー。内部詳細はレスポンスに含めない
