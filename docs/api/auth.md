# 認証API

## 目的

公開`user_id`とパスワードでログインし、以降のリクエストをセッションCookieで認証する。新規登録もここで行う。

## 方式

- セッションはserver側の`sessions`テーブルで持ち、Cookie（`dabuchi_session`）でセッションtokenだけを渡す
- Cookieは`HttpOnly`（JavaScriptから読めない）、`SameSite=Lax`（他サイトからの送信を防ぐ）、本番のみ`Secure`
- DBにはtokenのSHA-256ハッシュだけを保存する。DBが漏れてもtokenは復元できず、なりすましに使えない
- 有効期間は7日。期限切れのセッションは認証に使えない
- パスワードはNode標準のscryptでハッシュ化して保存する（ソルトは毎回生成し、パラメータを値へ含める）

## Endpoints

| Method | Path               | 用途       |
| ------ | ------------------ | ---------- |
| `POST` | `/api/auth/signup` | 新規登録   |
| `POST` | `/api/auth/login`  | ログイン   |
| `POST` | `/api/auth/logout` | ログアウト |

## 新規登録

```http
POST /api/auth/signup
{ "userId": "new-user", "password": "correct horse battery", "name": "新井 太郎" }
```

- `userId`: 公開`user_id`。英数字で始まり、英数字・ハイフン・アンダースコアのみ。64文字まで
- `password`: 8〜128文字
- `name`: 表示名。100文字まで
- プロフィール画像は既定のアイコンを割り当てる（登録時には選ばせない）

成功時は`201 Created`で`{ "authenticated": true }`を返し、そのままログイン状態になる（セッションCookieを発行する）。

## ログイン

```http
POST /api/auth/login
{ "userId": "friend-001", "password": "dabuchi-dev" }
```

成功時は`200 OK`で`{ "authenticated": true }`。ユーザーの情報は`GET /api/me`で取得する。tokenはCookieでのみ渡し、レスポンスbodyには含めない。

## ログアウト

```http
POST /api/auth/logout
```

`204 No Content`。冪等で、Cookieが無い場合やすでに無効なセッションでも成功する。server側のセッションを削除し、Cookieも消す。

## Error responses

- `400 INVALID_REQUEST`: 入力の形式が不正（パスワードの長さ、`user_id`の文字種など）
- `401 INVALID_CREDENTIALS`: `user_id`かパスワードが違う。**どちらが違うかは区別しない**（存在する`user_id`を総当たりで特定させないため）
- `401 NOT_AUTHENTICATED`: 認証が必要なAPIへ、有効なセッション無しでアクセスした
- `409 USER_ID_ALREADY_TAKEN`: その`user_id`はすでに使われている
- `500 INTERNAL_SERVER_ERROR`: 想定外のエラー。内部詳細はレスポンスに含めない

## 開発環境

開発用シードの30ユーザーには、共通のパスワード`dabuchi-dev`が入っている。`npm run db:seed`で投入され、すでにパスワードが設定されているユーザーは上書きしない。

現時点では、既存APIの現在ユーザーはまだ`MOCK_USER_ID`から解決している。セッション由来へ切り替える変更は次のPRで行う。
