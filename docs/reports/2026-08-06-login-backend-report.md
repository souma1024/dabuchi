# 作業報告書

## 作業日時

2026年08月06日 20時36分07秒

## 作業対象

ログインの基盤（DB・認証ドメイン・新規登録／ログイン／ログアウトAPI）。

## 作業目的

`MOCK_USER_ID`固定をやめる前提として、パスワードとセッションを持たせ、実際にログインできるようにする。

## 変更内容

- migration V6を追加した。`users.password_hash`（NULL許可）と`sessions`テーブルを作る。
- パスワードのハッシュ化・検証をdomainへ追加した。Node標準のscryptを使い、ソルトとパラメータを保存値へ含める。
- セッションtokenの生成とハッシュ化をdomainへ追加した。有効期間は7日。
- 新規登録・ログイン・ログアウトのusecaseと、`/api/auth`のrouterを追加した。
- セッションCookieの読み書きを追加した。`HttpOnly`・`SameSite=Lax`・本番のみ`Secure`。
- 認証系エラーを共通の`errorHandler`へ追加した（400 / 401 / 409）。
- 開発用シードで、既存30ユーザーへ共通パスワード`dabuchi-dev`を設定するようにした。
- 認証APIのドキュメントを追加し、READMEを更新した。

## 変更したファイル

- `database/migrations/V6__add_credentials_and_sessions.sql`
- `database/rollback/V6__drop_credentials_and_sessions.sql`
- `database/seeds/development.sql`
- `backend/src/domain/password.ts` / `password.test.ts`
- `backend/src/domain/session.ts`
- `backend/src/application/ports/authRepository.ts`
- `backend/src/application/errors/authErrors.ts`
- `backend/src/application/usecases/logIn.ts` / `logIn.test.ts`
- `backend/src/application/usecases/logOut.ts`
- `backend/src/application/usecases/signUp.ts` / `signUp.test.ts`
- `backend/src/infrastructure/repositories/mysqlAuthRepository.ts`
- `backend/src/presentation/http/authRouter.ts`
- `backend/src/presentation/http/sessionCookie.ts` / `sessionCookie.test.ts`
- `backend/src/presentation/http/errorHandler.ts`
- `backend/src/app.ts` / `app.test.ts`
- `backend/src/server.ts`
- `backend/src/test/factories/appFactory.ts`
- `backend/src/test/factories/authRepositoryFactory.ts`
- `README.md`
- `docs/api/auth.md`
- `docs/reports/2026-08-06-login-backend-report.md`

## 変更意図

現在ユーザーの切り替えと画面は別PRにし、このPRでは「ログインできる状態」を作ることに絞った。既存APIの挙動は変えていないため、途中の状態でもmainは壊れない。

## 設計上の意図

セッションはserver側で持ち、CookieにはtokenだけをHttpOnlyで渡す。JavaScriptから読めないためXSSでtokenを抜かれず、ログアウトで即座に無効化できる。

DBにはtokenのSHA-256ハッシュだけを保存する。tokenは十分な長さの乱数なので、パスワードと違い総当たりされず、ソルトも要らない。DBが漏れてもtoken自体は復元できない。

パスワードのハッシュ化にはNode標準のscryptを使い、依存を増やしていない。保存値へアルゴリズムとコストパラメータを含めるため、後から強度を上げても既存の値を検証できる。

ログイン失敗は、ユーザーが存在しない場合もパスワード違いと同じ401・同じ文言にする。存在する`user_id`を総当たりで特定させないため。

`password_hash`をNULL許可にしたのは、既存ユーザーを消さずに列を足すため。NULLの間はログインできない（シードで埋める）。

## 影響範囲

- 既存APIの認証状態は変わらない。現在ユーザーは引き続き`MOCK_USER_ID`から解決する。
- 開発環境では`npm run db:migrate`と`npm run db:seed`の再実行が必要。
- 依存パッケージの追加は無し。

## 動作確認

- format / lint / typecheck / build: 成功
- frontend: 264件成功、backend: 361件成功（3件スキップ）
- docker環境で、シードユーザーのログイン成功（Cookieに`HttpOnly; SameSite=Lax`が付くこと）、パスワード違いの401、新規登録の201、重複`user_id`の409、ログアウトの204とセッション削除を確認した。確認で作ったユーザーとセッションは削除済み。

## 補足

次のPRで既存APIの現在ユーザーをセッション由来へ切り替え、`AUTH_MODE`と`MOCK_USER_ID`を廃止する。ADR 0004の「将来的な見直し条件」にあたるため、その時点でADRを更新する。
