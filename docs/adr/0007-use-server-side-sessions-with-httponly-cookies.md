# ADR 0007: セッションはserver側で持ち、HttpOnly Cookieで受け渡す

## 背景

ログインを実装するにあたり、認証済みユーザーをrequestごとに特定する必要がある。frontendはSPAで、開発時はViteのproxy経由、実行時は同一オリジンでbackendへアクセスする。

## 課題

なりすましを防ぎながら、frontendが自前でトークンを保管しなくて済む方式を選ぶ必要がある。ログアウトや期限切れで、発行済みの資格を確実に無効化できることも求められる。

## 選択肢

1. JWTを発行し、frontendが保管してAuthorizationヘッダで送る
2. ユーザーIDを署名付きCookieへ入れる（server側に状態を持たない）
3. server側に`sessions`テーブルを持ち、HttpOnly Cookieでセッションtokenだけを渡す

## 採用した案

選択肢3を採用する。`sessions`テーブルにtokenのSHA-256ハッシュ・ユーザー・有効期限を持ち、Cookie（`dabuchi_session`）は`HttpOnly`・`SameSite=Lax`・本番のみ`Secure`で発行する。

## 採用理由

- `HttpOnly`によりJavaScriptからtokenを読めない。XSSが起きてもtokenを持ち出されない
- ログアウトや期限切れで、server側のレコードを消せば即座に無効化できる
- frontendはCookie任せでよく、保管場所の選定や更新処理を持たなくて済む
- `SameSite=Lax`で、他サイトからの遷移でCookieが送られる範囲を絞れる

## メリット

- 発行済みの資格を後から失効させられる（選択肢1・2では難しい）
- DBにはtokenのハッシュだけを置くため、DBが漏れてもtoken自体は復元できない
- frontendにトークン管理のコードが増えない

## デメリット

- requestごとにセッションを引くためDBアクセスが1回増える
- 別オリジンのclientを足す場合はCORSとCookieの設定を見直す必要がある
- 期限切れセッションの掃除を別途行う必要がある（現状は認証時に期限で除外するだけ）

## 将来的な見直し条件

frontendを別オリジンで配信する場合、またはモバイルなどCookieを扱いにくいclientを足す場合に見直す。その時点でtoken方式との併用を検討する。
