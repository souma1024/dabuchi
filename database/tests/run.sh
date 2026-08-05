#!/usr/bin/env bash

set -euo pipefail

export MYSQL_DATABASE="${MYSQL_DATABASE:-dabuchi_test}"
export MYSQL_USER="${MYSQL_USER:-dabuchi_test}"
export MYSQL_PASSWORD="${MYSQL_PASSWORD:-test-only-password}"
export MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-test-only-root-password}"
export MYSQL_PORT="${MYSQL_PORT:-0}"
export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-dabuchi-db-test-$$}"

cleanup() {
  docker compose down --volumes --remove-orphans >/dev/null 2>&1 || true
}

trap cleanup EXIT

query() {
  docker compose exec -T \
    -e MYSQL_PWD="${MYSQL_PASSWORD}" \
    mysql \
    mysql --batch --skip-column-names \
    --default-character-set=utf8mb4 \
    --user="${MYSQL_USER}" \
    --database="${MYSQL_DATABASE}" \
    --execute="$1"
}

assert_equals() {
  local expected="$1"
  local actual="$2"
  local message="$3"

  if [[ "${actual}" != "${expected}" ]]; then
    echo "FAIL: ${message}" >&2
    echo "expected: ${expected}" >&2
    echo "actual:   ${actual}" >&2
    exit 1
  fi
}

docker compose up --detach --wait mysql
docker compose run --rm migrate

columns="$(query "
  SELECT GROUP_CONCAT(
    CONCAT(column_name, ':', column_type, ':', is_nullable)
    ORDER BY ordinal_position SEPARATOR ','
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users';
")"

assert_equals \
  "id:binary(16):NO,user_id:varchar(64):NO,balance:bigint unsigned:NO,user_name:varchar(100):NO,profile_url:varchar(255):NO,created_at:datetime(6):NO" \
  "${columns}" \
  "users table columns must match the migration"

primary_key="$(query "
  SELECT column_name
  FROM information_schema.key_column_usage
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND constraint_name = 'PRIMARY';
")"
assert_equals "id" "${primary_key}" "id must be the primary key"

unique_user_id="$(query "
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'user_id'
    AND non_unique = 0;
")"
assert_equals "1" "${unique_user_id}" "user_id must be unique"

query "
  INSERT INTO users (user_id, user_name, profile_url)
  VALUES ('auto-id-test', '自動採番テスト', '/assets/profiles/human1.png');
" >/dev/null

generated_uuid="$(query "
  SELECT IS_UUID(BIN_TO_UUID(id))
  FROM users
  WHERE user_id = 'auto-id-test';
")"
assert_equals "1" "${generated_uuid}" "id must be generated as a UUID"

default_balance="$(query "
  SELECT balance
  FROM users
  WHERE user_id = 'auto-id-test';
")"
assert_equals "0" "${default_balance}" "balance must default to zero"

if query "
  INSERT INTO users (user_id, user_name, profile_url)
  VALUES ('auto-id-test', '重複テスト', '/assets/profiles/human2.png');
" >/dev/null 2>&1; then
  echo "FAIL: duplicate user_id must be rejected" >&2
  exit 1
fi

if query "
  INSERT INTO users (user_id, balance, user_name, profile_url)
  VALUES ('negative-balance', -1, '残高テスト', '/assets/profiles/human3.png');
" >/dev/null 2>&1; then
  echo "FAIL: negative balance must be rejected" >&2
  exit 1
fi

transactions_columns="$(query "
  SELECT GROUP_CONCAT(
    CONCAT(column_name, ':', column_type, ':', is_nullable)
    ORDER BY ordinal_position SEPARATOR ','
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'transactions';
")"

assert_equals \
  "id:binary(16):NO,sender_id:binary(16):YES,recipient_id:binary(16):NO,amount:bigint unsigned:NO,created_at:datetime(6):NO" \
  "${transactions_columns}" \
  "transactions table columns must match the migration"

transactions_primary_key="$(query "
  SELECT column_name
  FROM information_schema.key_column_usage
  WHERE table_schema = DATABASE()
    AND table_name = 'transactions'
    AND constraint_name = 'PRIMARY';
")"
assert_equals "id" "${transactions_primary_key}" "transactions id must be the primary key"

transactions_foreign_keys="$(query "
  SELECT GROUP_CONCAT(
    CONCAT(column_name, '->', referenced_table_name, '.', referenced_column_name)
    ORDER BY column_name SEPARATOR ','
  )
  FROM information_schema.key_column_usage
  WHERE table_schema = DATABASE()
    AND table_name = 'transactions'
    AND referenced_table_name IS NOT NULL;
")"
assert_equals \
  "recipient_id->users.id,sender_id->users.id" \
  "${transactions_foreign_keys}" \
  "transactions sender_id and recipient_id must reference users(id)"

sender_index_columns="$(query "
  SELECT GROUP_CONCAT(column_name ORDER BY seq_in_index SEPARATOR ',')
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'transactions'
    AND index_name = 'ix_transactions_sender_created';
")"
assert_equals \
  "sender_id,created_at,id" \
  "${sender_index_columns}" \
  "sender listing index must cover (sender_id, created_at, id)"

recipient_index_columns="$(query "
  SELECT GROUP_CONCAT(column_name ORDER BY seq_in_index SEPARATOR ',')
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'transactions'
    AND index_name = 'ix_transactions_recipient_created';
")"
assert_equals \
  "recipient_id,created_at,id" \
  "${recipient_index_columns}" \
  "recipient listing index must cover (recipient_id, created_at, id)"

query "
  INSERT INTO users (user_id, user_name, profile_url)
  VALUES
    ('tx-sender', '送金元テスト', '/assets/profiles/human1.png'),
    ('tx-recipient', '送金先テスト', '/assets/profiles/human2.png');
" >/dev/null

query "
  INSERT INTO transactions (sender_id, recipient_id, amount)
  VALUES (
    (SELECT id FROM users WHERE user_id = 'tx-sender'),
    (SELECT id FROM users WHERE user_id = 'tx-recipient'),
    1500
  );
" >/dev/null

transactions_generated_uuid="$(query "
  SELECT IS_UUID(BIN_TO_UUID(id))
  FROM transactions
  WHERE sender_id = (SELECT id FROM users WHERE user_id = 'tx-sender')
    AND amount = 1500;
")"
assert_equals "1" "${transactions_generated_uuid}" "transactions id must be generated as a UUID"

query "
  INSERT INTO transactions (recipient_id, amount)
  VALUES (
    (SELECT id FROM users WHERE user_id = 'tx-recipient'),
    3000
  );
" >/dev/null

charge_sender_is_null="$(query "
  SELECT sender_id IS NULL
  FROM transactions
  WHERE recipient_id = (SELECT id FROM users WHERE user_id = 'tx-recipient')
    AND amount = 3000;
")"
assert_equals "1" "${charge_sender_is_null}" "a charge transaction may omit sender_id"

if query "
  INSERT INTO transactions (sender_id, amount)
  VALUES (
    (SELECT id FROM users WHERE user_id = 'tx-sender'),
    1000
  );
" >/dev/null 2>&1; then
  echo "FAIL: recipient_id is required" >&2
  exit 1
fi

if query "
  INSERT INTO transactions (sender_id, recipient_id, amount)
  VALUES (
    (SELECT id FROM users WHERE user_id = 'tx-sender'),
    (SELECT id FROM users WHERE user_id = 'tx-recipient'),
    0
  );
" >/dev/null 2>&1; then
  echo "FAIL: non-positive amount must be rejected" >&2
  exit 1
fi

if query "
  INSERT INTO transactions (sender_id, recipient_id, amount)
  VALUES (
    (SELECT id FROM users WHERE user_id = 'tx-sender'),
    (SELECT id FROM users WHERE user_id = 'tx-sender'),
    1000
  );
" >/dev/null 2>&1; then
  echo "FAIL: sender and recipient must differ" >&2
  exit 1
fi

if query "
  INSERT INTO transactions (sender_id, recipient_id, amount)
  VALUES (
    (SELECT id FROM users WHERE user_id = 'tx-sender'),
    UUID_TO_BIN('00000000-0000-0000-0000-000000000000'),
    1000
  );
" >/dev/null 2>&1; then
  echo "FAIL: recipient_id must reference an existing user" >&2
  exit 1
fi

bash database/scripts/seed.sh

seeded_user_name="$(query "
  SELECT user_name
  FROM users
  WHERE user_id = 'friend-001';
")"
assert_equals \
  "山田 太郎" \
  "${seeded_user_name}" \
  "development seed must preserve utf8mb4 user names"

echo "Database migration and seed tests passed."
