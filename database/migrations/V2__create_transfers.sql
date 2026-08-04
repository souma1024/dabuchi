CREATE TABLE transfers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sender_id BINARY(16) NOT NULL,
  recipient_id BINARY(16) NOT NULL,
  amount BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT pk_transfers PRIMARY KEY (id),
  CONSTRAINT fk_transfers_sender_id
    FOREIGN KEY (sender_id) REFERENCES users (id),
  CONSTRAINT fk_transfers_recipient_id
    FOREIGN KEY (recipient_id) REFERENCES users (id),
  CONSTRAINT chk_transfers_distinct_users CHECK (sender_id <> recipient_id),
  CONSTRAINT chk_transfers_amount_positive CHECK (amount > 0),
  INDEX idx_transfers_sender_id (sender_id),
  INDEX idx_transfers_recipient_id (recipient_id)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;
