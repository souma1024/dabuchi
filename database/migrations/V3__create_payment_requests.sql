CREATE TABLE payment_requests (
  id BINARY(16) NOT NULL DEFAULT (UUID_TO_BIN(UUID())),
  requester_id BINARY(16) NOT NULL,
  recipient_id BINARY(16) NOT NULL,
  amount BIGINT UNSIGNED NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  responded_at DATETIME(6) DEFAULT NULL,
  CONSTRAINT pk_payment_requests PRIMARY KEY (id),
  CONSTRAINT fk_payment_requests_requester_id
    FOREIGN KEY (requester_id) REFERENCES users (id),
  CONSTRAINT fk_payment_requests_recipient_id
    FOREIGN KEY (recipient_id) REFERENCES users (id),
  CONSTRAINT chk_payment_requests_distinct_users
    CHECK (requester_id <> recipient_id),
  CONSTRAINT chk_payment_requests_amount_positive CHECK (amount > 0),
  CONSTRAINT chk_payment_requests_status
    CHECK (status IN ('pending', 'accepted', 'rejected')),
  CONSTRAINT chk_payment_requests_response_time
    CHECK (
      (status = 'pending' AND responded_at IS NULL)
      OR (
        status IN ('accepted', 'rejected')
        AND responded_at IS NOT NULL
        AND responded_at >= created_at
      )
    ),
  INDEX idx_payment_requests_recipient_status_created
    (recipient_id, status, created_at, id),
  INDEX idx_payment_requests_requester_created
    (requester_id, created_at, id)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;
