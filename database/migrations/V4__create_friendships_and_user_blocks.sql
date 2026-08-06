CREATE TABLE friendships (
  id BINARY(16) NOT NULL DEFAULT (UUID_TO_BIN(UUID())),
  user1_id BINARY(16) NOT NULL,
  user2_id BINARY(16) NOT NULL,
  added_by_id BINARY(16) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT pk_friendships PRIMARY KEY (id),
  CONSTRAINT uq_friendships_user_pair UNIQUE (user1_id, user2_id),
  CONSTRAINT fk_friendships_user1_id
    FOREIGN KEY (user1_id) REFERENCES users (id),
  CONSTRAINT fk_friendships_user2_id
    FOREIGN KEY (user2_id) REFERENCES users (id),
  CONSTRAINT fk_friendships_added_by_id
    FOREIGN KEY (added_by_id) REFERENCES users (id),
  CONSTRAINT chk_friendships_canonical_pair CHECK (user1_id < user2_id),
  CONSTRAINT chk_friendships_added_by_participant
    CHECK (added_by_id = user1_id OR added_by_id = user2_id),
  INDEX idx_friendships_user2_id (user2_id)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE friendship_notes (
  friendship_id BINARY(16) NOT NULL,
  user_id BINARY(16) NOT NULL,
  message VARCHAR(255) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL
    DEFAULT CURRENT_TIMESTAMP(6)
    ON UPDATE CURRENT_TIMESTAMP(6),
  CONSTRAINT pk_friendship_notes PRIMARY KEY (friendship_id, user_id),
  CONSTRAINT fk_friendship_notes_friendship_id
    FOREIGN KEY (friendship_id) REFERENCES friendships (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_friendship_notes_user_id
    FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT chk_friendship_notes_message_not_blank
    CHECK (CHAR_LENGTH(TRIM(message)) > 0),
  INDEX idx_friendship_notes_user_id (user_id)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE user_blocks (
  blocker_id BINARY(16) NOT NULL,
  blocked_user_id BINARY(16) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT pk_user_blocks PRIMARY KEY (blocker_id, blocked_user_id),
  CONSTRAINT fk_user_blocks_blocker_id
    FOREIGN KEY (blocker_id) REFERENCES users (id),
  CONSTRAINT fk_user_blocks_blocked_user_id
    FOREIGN KEY (blocked_user_id) REFERENCES users (id),
  CONSTRAINT chk_user_blocks_distinct_users
    CHECK (blocker_id <> blocked_user_id),
  INDEX idx_user_blocks_blocked_user_id (blocked_user_id)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;
