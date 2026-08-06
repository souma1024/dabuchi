-- WARNING: This rollback removes the idempotency_key column and its constraints from transfers.
-- CHECK と UNIQUE を先に外してからカラムを削除する。
ALTER TABLE transfers
  DROP CHECK chk_transfers_idempotency_key_not_blank,
  DROP INDEX uq_transfers_idempotency_key,
  DROP COLUMN idempotency_key;
