-- WARNING: This rollback removes the responded_by column and its constraints from payment_requests.
-- 「誰が請求を終わらせたか」は復元できない。rejected が拒否か取り消しかの区別も失われる。
-- CHECK と FOREIGN KEY を先に外してからカラムを削除する。
ALTER TABLE payment_requests
  DROP CHECK chk_payment_requests_responded_by,
  DROP FOREIGN KEY fk_payment_requests_responded_by,
  DROP COLUMN responded_by;
