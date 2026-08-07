-- ログイン導入に伴い、パスワードとセッションを持たせる。
-- password_hashは既存ユーザーの分をシードで埋めるまでNULLを許す。NULLの間はログインできない。
ALTER TABLE users
  ADD COLUMN password_hash VARCHAR(255) NULL AFTER user_id;

CREATE TABLE sessions (
  -- セッションtokenはCookieでのみ渡し、DBにはSHA-256のハッシュだけを置く。
  -- DBが漏れてもtoken自体は復元できず、なりすましに使えない。
  token_hash BINARY(32) NOT NULL,
  user_id BINARY(16) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  expires_at DATETIME(6) NOT NULL,
  CONSTRAINT pk_sessions PRIMARY KEY (token_hash),
  CONSTRAINT fk_sessions_user_id
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT chk_sessions_expires_after_created CHECK (expires_at > created_at),
  -- ログアウトや期限切れの掃除で、ユーザー単位・期限順に引けるようにする。
  INDEX idx_sessions_user_id (user_id),
  INDEX idx_sessions_expires_at (expires_at)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;
