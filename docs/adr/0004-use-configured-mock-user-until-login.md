# ADR 0004: ログイン実装までは設定されたmock userを利用する

## 背景

ホーム画面は現在ユーザーの名前、プロフィール画像、残高を表示する必要があるが、認証・ログイン機能はまだ実装されていない。

## 課題

ユーザーをコードやSQLへ直接ハードコードせずに開発を進め、将来の認証導入時に置き換えやすくする必要がある。また、mock認証を本番で誤使用してはならない。

## 選択肢

1. handlerやSQLへユーザーUUIDを直接記述する
2. request parameterで現在ユーザーを毎回指定する
3. 開発環境の設定から公開`user_id`を取得し、usecaseへ渡す

## 採用した案

選択肢3を採用する。`AUTH_MODE=mock`と`MOCK_USER_ID=friend-001`を開発用設定に置き、HTTP層からcurrent user取得usecaseへ公開`user_id`を渡す。

## 採用理由

- ユーザー識別子をコード、usecase、SQLへ固定しない
- requestから任意のcurrent userを指定できない
- usecaseとrepositoryは将来の認証方式を知らずに維持できる
- `NODE_ENV`を検証し、mock認証を開発・テスト環境へ限定できる

## メリット

- 環境設定だけで開発用ユーザーを切り替えられる
- 将来はHTTP層のmock値を認証済みユーザーIDへ置き換えられる
- 内部UUIDと友達追加用の公開`user_id`を混同しない

## デメリット

- ログイン実装までは複数ユーザーを同時に扱えない
- `.env`の設定が不足しているとbackendが起動しない
- mock認証は認可機能を提供しない

## 将来的な見直し条件

ログイン・セッションまたはtoken認証を導入する時点で見直す。認証後はrequestから検証済みのcurrent userを取得し、`AUTH_MODE=mock`と`MOCK_USER_ID`への依存を削除する。
