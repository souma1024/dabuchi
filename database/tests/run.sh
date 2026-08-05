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

query "
  INSERT INTO transfers (user_id, amount)
  VALUES ('auto-id-test', 1500);
" >/dev/null

saved_transfer="$(query "
  SELECT CONCAT(user_id, ':', amount)
  FROM transfers
  WHERE user_id = 'auto-id-test';
")"
assert_equals \
  "auto-id-test:1500" \
  "${saved_transfer}" \
  "transfer must save user_id and amount"

if query "
  INSERT INTO transfers (user_id, amount)
  VALUES ('auto-id-test', 0);
" >/dev/null 2>&1; then
  echo "FAIL: zero transfer amount must be rejected" >&2
  exit 1
fi

if query "
  INSERT INTO transfers (user_id, amount)
  VALUES ('missing-user', 100);
" >/dev/null 2>&1; then
  echo "FAIL: unknown transfer user_id must be rejected" >&2
  exit 1
fi

echo "Database migration tests passed."
