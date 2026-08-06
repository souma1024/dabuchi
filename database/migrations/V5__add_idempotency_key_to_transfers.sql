-- 送金の冪等性キー。二重送信・リトライ・ダブルクリックで同一送金が重複実行されるのを防ぐ。
-- NULL 許容: 既存行とキー未指定の挿入を許すため。MySQLのUNIQUEは複数のNULLを重複とみなさない。
-- 値が存在する場合は空白のみを禁止する。
ALTER TABLE transfers
  ADD COLUMN idempotency_key VARCHAR(64) DEFAULT NULL,
  ADD CONSTRAINT uq_transfers_idempotency_key UNIQUE (idempotency_key),
  ADD CONSTRAINT chk_transfers_idempotency_key_not_blank
    CHECK (
      idempotency_key IS NULL
      OR CHAR_LENGTH(TRIM(idempotency_key)) > 0
    );
