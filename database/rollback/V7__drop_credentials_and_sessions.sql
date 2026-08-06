-- WARNING: This rollback deletes all sessions and stored passwords.
DROP TABLE IF EXISTS sessions;

ALTER TABLE users
  DROP COLUMN password_hash;
