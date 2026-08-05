CREATE TABLE transactions (
  id BINARY(16) NOT NULL DEFAULT (UUID_TO_BIN(UUID())),
  sender_id BINARY(16) DEFAULT NULL,
  recipient_id BINARY(16) NOT NULL,
  amount BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT pk_transactions PRIMARY KEY (id),
  CONSTRAINT fk_transactions_sender FOREIGN KEY (sender_id) REFERENCES users (id),
  CONSTRAINT fk_transactions_recipient FOREIGN KEY (recipient_id) REFERENCES users (id),
  CONSTRAINT chk_transactions_amount_positive CHECK (amount > 0),
  CONSTRAINT chk_transactions_sender_ne_recipient CHECK (sender_id <> recipient_id),
  INDEX ix_transactions_sender_created (sender_id, created_at, id),
  INDEX ix_transactions_recipient_created (recipient_id, created_at, id)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;
