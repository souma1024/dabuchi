CREATE TABLE users (
  id BINARY(16) NOT NULL DEFAULT (UUID_TO_BIN(UUID())),
  user_id VARCHAR(64) NOT NULL,
  balance BIGINT UNSIGNED NOT NULL DEFAULT 0,
  user_name VARCHAR(100) NOT NULL,
  profile_url VARCHAR(255) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT pk_users PRIMARY KEY (id),
  CONSTRAINT uq_users_user_id UNIQUE (user_id),
  CONSTRAINT chk_users_balance_non_negative CHECK (balance >= 0),
  CONSTRAINT chk_users_user_id_not_blank CHECK (CHAR_LENGTH(TRIM(user_id)) > 0),
  CONSTRAINT chk_users_user_name_not_blank CHECK (CHAR_LENGTH(TRIM(user_name)) > 0),
  CONSTRAINT chk_users_profile_url_not_blank CHECK (CHAR_LENGTH(TRIM(profile_url)) > 0)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

