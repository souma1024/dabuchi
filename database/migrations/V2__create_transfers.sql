CREATE TABLE transfers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id VARCHAR(64) NOT NULL,
  amount BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT pk_transfers PRIMARY KEY (id),
  CONSTRAINT fk_transfers_user_id
    FOREIGN KEY (user_id) REFERENCES users (user_id),
  CONSTRAINT chk_transfers_amount_positive CHECK (amount > 0),
  INDEX idx_transfers_user_id (user_id)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;
