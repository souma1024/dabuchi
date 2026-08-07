-- 送金の冪等性キー。二重送信・リトライ・ダブルクリックで同一送金が重複実行されるのを防ぐ。
-- NULL 許容: 既存行とキー未指定の挿入を許すため。MySQLのUNIQUEは複数のNULLを重複とみなさない。
-- 値が存在する場合は空白のみを禁止する。
-- 列の追加と、その列への制約追加は文を分ける。
-- TiDBは同じALTER内で追加したばかりの列を参照できず、column does not existで失敗する。
ALTER TABLE transfers
  ADD COLUMN idempotency_key VARCHAR(64) DEFAULT NULL;

ALTER TABLE transfers
  ADD CONSTRAINT uq_transfers_idempotency_key UNIQUE (idempotency_key);

ALTER TABLE transfers
  ADD CONSTRAINT chk_transfers_idempotency_key_not_blank
    CHECK (
      idempotency_key IS NULL
      OR CHAR_LENGTH(TRIM(idempotency_key)) > 0
    );
