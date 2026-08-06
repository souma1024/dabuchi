#!/usr/bin/env bash

set -euo pipefail

export MYSQL_DATABASE="${MYSQL_DATABASE:-dabuchi_test}"
export MYSQL_USER="${MYSQL_USER:-dabuchi_test}"
export MYSQL_PASSWORD="${MYSQL_PASSWORD:-test-only-password}"
export MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-test-only-root-password}"
export MYSQL_PORT="${MYSQL_PORT:-0}"
export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-dabuchi-db-test-$$}"

# migration / rollback のSQLを直接流し込むテストがあるため、呼び出し位置に依存しないパスを持つ。
repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

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

query "
  INSERT INTO users (user_id, user_name, profile_url)
  VALUES ('recipient-test', '受取人テスト', '/assets/profiles/human2.png');

  INSERT INTO transfers (sender_id, recipient_id, amount)
  SELECT sender.id, recipient.id, 1500
  FROM users AS sender
  CROSS JOIN users AS recipient
  WHERE sender.user_id = 'auto-id-test'
    AND recipient.user_id = 'recipient-test';
" >/dev/null

saved_transfer="$(query "
  SELECT CONCAT(sender.user_id, ':', recipient.user_id, ':', transfers.amount)
  FROM transfers
  JOIN users AS sender ON sender.id = transfers.sender_id
  JOIN users AS recipient ON recipient.id = transfers.recipient_id;
")"
assert_equals \
  "auto-id-test:recipient-test:1500" \
  "${saved_transfer}" \
  "transfer must save sender_id, recipient_id and amount"

if query "
  INSERT INTO transfers (sender_id, recipient_id, amount)
  SELECT sender.id, recipient.id, 0
  FROM users AS sender
  CROSS JOIN users AS recipient
  WHERE sender.user_id = 'auto-id-test'
    AND recipient.user_id = 'recipient-test';
" >/dev/null 2>&1; then
  echo "FAIL: zero transfer amount must be rejected" >&2
  exit 1
fi

if query "
  INSERT INTO transfers (sender_id, recipient_id, amount)
  VALUES (
    UUID_TO_BIN('00000000-0000-0000-0000-000000000000'),
    UUID_TO_BIN('00000000-0000-0000-0000-000000000001'),
    100
  );
" >/dev/null 2>&1; then
  echo "FAIL: unknown transfer user IDs must be rejected" >&2
  exit 1
fi

if query "
  INSERT INTO transfers (sender_id, recipient_id, amount)
  SELECT id, id, 100
  FROM users
  WHERE user_id = 'auto-id-test';
" >/dev/null 2>&1; then
  echo "FAIL: sender and recipient must be different" >&2
  exit 1
fi

query "
  INSERT INTO transfers (sender_id, recipient_id, amount, idempotency_key)
  SELECT sender.id, recipient.id, 700, 'idem-key-001'
  FROM users AS sender
  CROSS JOIN users AS recipient
  WHERE sender.user_id = 'auto-id-test'
    AND recipient.user_id = 'recipient-test';
" >/dev/null

saved_idempotency_key="$(query "
  SELECT idempotency_key
  FROM transfers
  WHERE idempotency_key = 'idem-key-001';
")"
assert_equals \
  "idem-key-001" \
  "${saved_idempotency_key}" \
  "transfer must store the idempotency key"

query "
  INSERT INTO transfers (sender_id, recipient_id, amount)
  SELECT sender.id, recipient.id, 650
  FROM users AS sender
  CROSS JOIN users AS recipient
  WHERE sender.user_id = 'auto-id-test'
    AND recipient.user_id = 'recipient-test';
" >/dev/null

null_idempotency_key_count="$(query "
  SELECT COUNT(*)
  FROM transfers
  WHERE idempotency_key IS NULL;
")"
assert_equals \
  "2" \
  "${null_idempotency_key_count}" \
  "unique idempotency key must allow multiple NULLs"

if query "
  INSERT INTO transfers (sender_id, recipient_id, amount, idempotency_key)
  SELECT sender.id, recipient.id, 800, 'idem-key-001'
  FROM users AS sender
  CROSS JOIN users AS recipient
  WHERE sender.user_id = 'auto-id-test'
    AND recipient.user_id = 'recipient-test';
" >/dev/null 2>&1; then
  echo "FAIL: duplicate idempotency key must be rejected" >&2
  exit 1
fi

if query "
  INSERT INTO transfers (sender_id, recipient_id, amount, idempotency_key)
  SELECT sender.id, recipient.id, 900, '   '
  FROM users AS sender
  CROSS JOIN users AS recipient
  WHERE sender.user_id = 'auto-id-test'
    AND recipient.user_id = 'recipient-test';
" >/dev/null 2>&1; then
  echo "FAIL: blank idempotency key must be rejected" >&2
  exit 1
fi

payment_request_columns="$(query "
  SELECT GROUP_CONCAT(
    CONCAT(column_name, ':', column_type, ':', is_nullable)
    ORDER BY ordinal_position SEPARATOR ','
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'payment_requests';
")"
assert_equals \
  "id:binary(16):NO,requester_id:binary(16):NO,recipient_id:binary(16):NO,amount:bigint unsigned:NO,status:varchar(16):NO,created_at:datetime(6):NO,responded_at:datetime(6):YES,responded_by:binary(16):YES" \
  "${payment_request_columns}" \
  "payment_requests columns must match the migration"

payment_request_foreign_keys="$(query "
  SELECT GROUP_CONCAT(
    CONCAT(column_name, '->', referenced_table_name, '.', referenced_column_name)
    ORDER BY column_name SEPARATOR ','
  )
  FROM information_schema.key_column_usage
  WHERE table_schema = DATABASE()
    AND table_name = 'payment_requests'
    AND referenced_table_name IS NOT NULL;
")"
assert_equals \
  "recipient_id->users.id,requester_id->users.id,responded_by->users.id" \
  "${payment_request_foreign_keys}" \
  "payment request participants must reference users(id)"

recipient_request_index="$(query "
  SELECT GROUP_CONCAT(column_name ORDER BY seq_in_index SEPARATOR ',')
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'payment_requests'
    AND index_name = 'idx_payment_requests_recipient_status_created';
")"
assert_equals \
  "recipient_id,status,created_at,id" \
  "${recipient_request_index}" \
  "recipient request index must support pending request pagination"

query "
  INSERT INTO payment_requests (requester_id, recipient_id, amount)
  SELECT requester.id, recipient.id, 2400
  FROM users AS requester
  CROSS JOIN users AS recipient
  WHERE requester.user_id = 'auto-id-test'
    AND recipient.user_id = 'recipient-test';
" >/dev/null

saved_payment_request="$(query "
  SELECT CONCAT(
    IS_UUID(BIN_TO_UUID(payment_requests.id)), ':',
    requester.user_id, '->', recipient.user_id, ':',
    payment_requests.amount, ':', payment_requests.status, ':',
    payment_requests.responded_at IS NULL
  )
  FROM payment_requests
  JOIN users AS requester ON requester.id = payment_requests.requester_id
  JOIN users AS recipient ON recipient.id = payment_requests.recipient_id;
")"
assert_equals \
  "1:auto-id-test->recipient-test:2400:pending:1" \
  "${saved_payment_request}" \
  "payment request must generate a UUID and default to pending"

if query "
  INSERT INTO payment_requests (requester_id, recipient_id, amount)
  SELECT requester.id, recipient.id, 0
  FROM users AS requester
  CROSS JOIN users AS recipient
  WHERE requester.user_id = 'auto-id-test'
    AND recipient.user_id = 'recipient-test';
" >/dev/null 2>&1; then
  echo "FAIL: zero payment request amount must be rejected" >&2
  exit 1
fi

if query "
  INSERT INTO payment_requests (requester_id, recipient_id, amount)
  SELECT id, id, 100
  FROM users
  WHERE user_id = 'auto-id-test';
" >/dev/null 2>&1; then
  echo "FAIL: requester and recipient must be different" >&2
  exit 1
fi

if query "
  INSERT INTO payment_requests (
    requester_id,
    recipient_id,
    amount,
    status
  )
  SELECT requester.id, recipient.id, 100, 'accepted'
  FROM users AS requester
  CROSS JOIN users AS recipient
  WHERE requester.user_id = 'auto-id-test'
    AND recipient.user_id = 'recipient-test';
" >/dev/null 2>&1; then
  echo "FAIL: responded payment request must have responded_at" >&2
  exit 1
fi

query "
  INSERT INTO payment_requests (
    requester_id,
    recipient_id,
    amount,
    status,
    created_at,
    responded_at
  )
  SELECT
    requester.id,
    recipient.id,
    100,
    'accepted',
    '2026-08-05 12:00:00.000000',
    '2026-08-05 12:00:00.000000'
  FROM users AS requester
  CROSS JOIN users AS recipient
  WHERE requester.user_id = 'auto-id-test'
    AND recipient.user_id = 'recipient-test';
"

valid_response_time_count="$(query "
  SELECT COUNT(*)
  FROM payment_requests
  WHERE status = 'accepted'
    AND responded_at = created_at;
")"
assert_equals \
  "1" \
  "${valid_response_time_count}" \
  "responded_at equal to created_at must be accepted"

for responded_status in accepted rejected; do
  if query "
    INSERT INTO payment_requests (
      requester_id,
      recipient_id,
      amount,
      status,
      created_at,
      responded_at
    )
    SELECT
      requester.id,
      recipient.id,
      100,
      '${responded_status}',
      '2026-08-05 12:00:00.000000',
      '2026-08-05 11:59:59.999999'
    FROM users AS requester
    CROSS JOIN users AS recipient
    WHERE requester.user_id = 'auto-id-test'
      AND recipient.user_id = 'recipient-test';
  " >/dev/null 2>&1; then
    echo "FAIL: ${responded_status} payment request must not predate created_at" >&2
    exit 1
  fi
done

# responded_by は請求の当事者だけを指せる。第三者を入れられると
# 「誰が終わらせたか」が信用できなくなる。
query "
  INSERT INTO users (user_id, user_name, profile_url)
  VALUES ('outsider-test', '第三者テスト', '/assets/profiles/human3.png');
"

if query "
  INSERT INTO payment_requests (
    requester_id,
    recipient_id,
    amount,
    status,
    created_at,
    responded_at,
    responded_by
  )
  SELECT
    requester.id,
    recipient.id,
    100,
    'rejected',
    '2026-08-05 12:00:00.000000',
    '2026-08-05 12:30:00.000000',
    outsider.id
  FROM users AS requester
  CROSS JOIN users AS recipient
  CROSS JOIN users AS outsider
  WHERE requester.user_id = 'auto-id-test'
    AND recipient.user_id = 'recipient-test'
    AND outsider.user_id = 'outsider-test';
" >/dev/null 2>&1; then
  echo "FAIL: responded_by must reference the requester or the recipient" >&2
  exit 1
fi

# 承認できるのは被請求者だけ。請求者が自分の請求を承認した履歴は作れてはならない。
if query "
  INSERT INTO payment_requests (
    requester_id,
    recipient_id,
    amount,
    status,
    created_at,
    responded_at,
    responded_by
  )
  SELECT
    requester.id,
    recipient.id,
    100,
    'accepted',
    '2026-08-05 12:00:00.000000',
    '2026-08-05 12:30:00.000000',
    requester.id
  FROM users AS requester
  CROSS JOIN users AS recipient
  WHERE requester.user_id = 'auto-id-test'
    AND recipient.user_id = 'recipient-test';
" >/dev/null 2>&1; then
  echo "FAIL: a requester must not be recorded as the approver" >&2
  exit 1
fi

# pending のあいだは誰も応答していないため、responded_by は必ず NULL。
if query "
  INSERT INTO payment_requests (
    requester_id,
    recipient_id,
    amount,
    responded_by
  )
  SELECT requester.id, recipient.id, 100, recipient.id
  FROM users AS requester
  CROSS JOIN users AS recipient
  WHERE requester.user_id = 'auto-id-test'
    AND recipient.user_id = 'recipient-test';
" >/dev/null 2>&1; then
  echo "FAIL: pending payment request must not record responded_by" >&2
  exit 1
fi

# 請求者が取り消した場合。rejected のまま responded_by で拒否と区別する。
query "
  INSERT INTO payment_requests (
    requester_id,
    recipient_id,
    amount,
    status,
    created_at,
    responded_at,
    responded_by
  )
  SELECT
    requester.id,
    recipient.id,
    100,
    'rejected',
    '2026-08-05 12:00:00.000000',
    '2026-08-05 12:30:00.000000',
    requester.id
  FROM users AS requester
  CROSS JOIN users AS recipient
  WHERE requester.user_id = 'auto-id-test'
    AND recipient.user_id = 'recipient-test';
"

canceled_by_requester_count="$(query "
  SELECT COUNT(*)
  FROM payment_requests
  WHERE status = 'rejected'
    AND responded_by = requester_id;
")"
assert_equals \
  "1" \
  "${canceled_by_requester_count}" \
  "a requester must be able to end their own payment request"

if query "
  INSERT INTO payment_requests (requester_id, recipient_id, amount)
  VALUES (
    (SELECT id FROM users WHERE user_id = 'auto-id-test'),
    UUID_TO_BIN('00000000-0000-0000-0000-000000000000'),
    100
  );
" >/dev/null 2>&1; then
  echo "FAIL: payment request recipient must exist" >&2
  exit 1
fi

friendship_columns="$(query "
  SELECT GROUP_CONCAT(
    CONCAT(column_name, ':', column_type, ':', is_nullable)
    ORDER BY ordinal_position SEPARATOR ','
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'friendships';
")"
assert_equals \
  "id:binary(16):NO,user1_id:binary(16):NO,user2_id:binary(16):NO,added_by_id:binary(16):NO,created_at:datetime(6):NO" \
  "${friendship_columns}" \
  "friendships columns must match the migration"

friendship_foreign_keys="$(query "
  SELECT GROUP_CONCAT(
    CONCAT(column_name, '->', referenced_table_name, '.', referenced_column_name)
    ORDER BY column_name SEPARATOR ','
  )
  FROM information_schema.key_column_usage
  WHERE table_schema = DATABASE()
    AND table_name = 'friendships'
    AND referenced_table_name IS NOT NULL;
")"
assert_equals \
  "added_by_id->users.id,user1_id->users.id,user2_id->users.id" \
  "${friendship_foreign_keys}" \
  "friendship participants must reference users(id)"

query "
  INSERT INTO users (user_id, user_name, profile_url)
  VALUES ('friendship-third-user', '第三ユーザー', '/assets/profiles/human3.png');

  INSERT INTO friendships (user1_id, user2_id, added_by_id)
  SELECT
    IF(adder.id < friend.id, adder.id, friend.id),
    IF(adder.id < friend.id, friend.id, adder.id),
    adder.id
  FROM users AS adder
  CROSS JOIN users AS friend
  WHERE adder.user_id = 'auto-id-test'
    AND friend.user_id = 'recipient-test';
" >/dev/null

saved_friendship="$(query "
  SELECT CONCAT(
    IS_UUID(BIN_TO_UUID(friendships.id)), ':',
    adder.user_id
  )
  FROM friendships
  JOIN users AS adder ON adder.id = friendships.added_by_id;
")"
assert_equals \
  "1:auto-id-test" \
  "${saved_friendship}" \
  "friendship must generate a UUID and preserve who added it"

if query "
  INSERT INTO friendships (user1_id, user2_id, added_by_id)
  SELECT
    IF(adder.id < friend.id, adder.id, friend.id),
    IF(adder.id < friend.id, friend.id, adder.id),
    adder.id
  FROM users AS adder
  CROSS JOIN users AS friend
  WHERE adder.user_id = 'auto-id-test'
    AND friend.user_id = 'recipient-test';
" >/dev/null 2>&1; then
  echo "FAIL: duplicate friendship must be rejected" >&2
  exit 1
fi

if query "
  INSERT INTO friendships (user1_id, user2_id, added_by_id)
  SELECT id, id, id
  FROM users
  WHERE user_id = 'auto-id-test';
" >/dev/null 2>&1; then
  echo "FAIL: friendship participants must be different" >&2
  exit 1
fi

if query "
  INSERT INTO friendships (user1_id, user2_id, added_by_id)
  SELECT
    IF(adder.id < friend.id, adder.id, friend.id),
    IF(adder.id < friend.id, friend.id, adder.id),
    outsider.id
  FROM users AS adder
  CROSS JOIN users AS friend
  CROSS JOIN users AS outsider
  WHERE adder.user_id = 'auto-id-test'
    AND friend.user_id = 'recipient-test'
    AND outsider.user_id = 'friendship-third-user';
" >/dev/null 2>&1; then
  echo "FAIL: added_by_id must be a friendship participant" >&2
  exit 1
fi

if query "
  INSERT INTO friendships (user1_id, user2_id, added_by_id)
  SELECT
    IF(adder.id < friend.id, friend.id, adder.id),
    IF(adder.id < friend.id, adder.id, friend.id),
    adder.id
  FROM users AS adder
  CROSS JOIN users AS friend
  WHERE adder.user_id = 'auto-id-test'
    AND friend.user_id = 'friendship-third-user';
" >/dev/null 2>&1; then
  echo "FAIL: friendship pair must use canonical user order" >&2
  exit 1
fi

friendship_note_columns="$(query "
  SELECT GROUP_CONCAT(
    CONCAT(column_name, ':', column_type, ':', is_nullable)
    ORDER BY ordinal_position SEPARATOR ','
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'friendship_notes';
")"
assert_equals \
  "friendship_id:binary(16):NO,user_id:binary(16):NO,message:varchar(255):NO,created_at:datetime(6):NO,updated_at:datetime(6):NO" \
  "${friendship_note_columns}" \
  "friendship_notes columns must match the migration"

query "
  INSERT INTO friendship_notes (friendship_id, user_id, message)
  SELECT friendships.id, adder.id, '友達になりましょう'
  FROM friendships
  JOIN users AS adder ON adder.id = friendships.added_by_id;
" >/dev/null

adder_note="$(query "
  SELECT CONCAT(users.user_id, ':', friendship_notes.message)
  FROM friendship_notes
  JOIN users ON users.id = friendship_notes.user_id;
")"
assert_equals \
  "auto-id-test:友達になりましょう" \
  "${adder_note}" \
  "the adding user must have an independent friendship note"

added_user_note_count="$(query "
  SELECT COUNT(*)
  FROM friendship_notes
  JOIN users ON users.id = friendship_notes.user_id
  WHERE users.user_id = 'recipient-test';
")"
assert_equals \
  "0" \
  "${added_user_note_count}" \
  "the added user's friendship note must initially be null"

if query "
  INSERT INTO friendship_notes (friendship_id, user_id, message)
  SELECT friendships.id, added_user.id, '   '
  FROM friendships
  JOIN users AS added_user
    ON added_user.id = CASE
      WHEN friendships.added_by_id = friendships.user1_id
        THEN friendships.user2_id
      ELSE friendships.user1_id
    END;
" >/dev/null 2>&1; then
  echo "FAIL: blank friendship note must be rejected" >&2
  exit 1
fi

query "
  UPDATE friendship_notes
  SET message = '編集後のメモ'
  WHERE user_id = (
    SELECT id
    FROM users
    WHERE user_id = 'auto-id-test'
  );
" >/dev/null

updated_note="$(query "
  SELECT message
  FROM friendship_notes;
")"
assert_equals \
  "編集後のメモ" \
  "${updated_note}" \
  "friendship note must be editable without changing the friendship"

user_block_columns="$(query "
  SELECT GROUP_CONCAT(
    CONCAT(column_name, ':', column_type, ':', is_nullable)
    ORDER BY ordinal_position SEPARATOR ','
  )
  FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'user_blocks';
")"
assert_equals \
  "blocker_id:binary(16):NO,blocked_user_id:binary(16):NO,created_at:datetime(6):NO" \
  "${user_block_columns}" \
  "user_blocks columns must match the migration"

query "
  INSERT INTO user_blocks (blocker_id, blocked_user_id)
  SELECT blocker.id, blocked.id
  FROM users AS blocker
  CROSS JOIN users AS blocked
  WHERE blocker.user_id = 'auto-id-test'
    AND blocked.user_id = 'recipient-test';
" >/dev/null

saved_block="$(query "
  SELECT CONCAT(blocker.user_id, '->', blocked.user_id)
  FROM user_blocks
  JOIN users AS blocker ON blocker.id = user_blocks.blocker_id
  JOIN users AS blocked ON blocked.id = user_blocks.blocked_user_id;
")"
assert_equals \
  "auto-id-test->recipient-test" \
  "${saved_block}" \
  "block direction must be preserved"

friendship_count_after_block="$(query "
  SELECT COUNT(*)
  FROM friendships;
")"
assert_equals \
  "1" \
  "${friendship_count_after_block}" \
  "blocking must preserve the friendship and its notes"

if query "
  INSERT INTO user_blocks (blocker_id, blocked_user_id)
  SELECT id, id
  FROM users
  WHERE user_id = 'auto-id-test';
" >/dev/null 2>&1; then
  echo "FAIL: users must not block themselves" >&2
  exit 1
fi

if query "
  INSERT INTO user_blocks (blocker_id, blocked_user_id)
  VALUES (
    (SELECT id FROM users WHERE user_id = 'auto-id-test'),
    UUID_TO_BIN('00000000-0000-0000-0000-000000000000')
  );
" >/dev/null 2>&1; then
  echo "FAIL: blocked user must exist" >&2
  exit 1
fi

# --- V6 のupgrade path -------------------------------------------------------
# ここまでのテストはV6適用済みのschemaに対して行うため、migration内のUPDATE文が
# 壊れても素通りしてしまう。V6を一度戻し、responded_byが無い状態で請求を作ってから
# 適用し直すことで、バックフィルそのものを検証する。
query "$(cat "${repository_root}/database/rollback/V6__drop_responded_by_from_payment_requests.sql")"

query "
  DELETE FROM payment_requests;

  INSERT INTO payment_requests (
    requester_id, recipient_id, amount, status, created_at, responded_at
  )
  SELECT requester.id, recipient.id, 100, 'pending', '2026-08-05 12:00:00.000000', NULL
  FROM users AS requester
  CROSS JOIN users AS recipient
  WHERE requester.user_id = 'auto-id-test'
    AND recipient.user_id = 'recipient-test';

  INSERT INTO payment_requests (
    requester_id, recipient_id, amount, status, created_at, responded_at
  )
  SELECT requester.id, recipient.id, 200, 'accepted', '2026-08-05 12:00:00.000000', '2026-08-05 12:30:00.000000'
  FROM users AS requester
  CROSS JOIN users AS recipient
  WHERE requester.user_id = 'auto-id-test'
    AND recipient.user_id = 'recipient-test';

  INSERT INTO payment_requests (
    requester_id, recipient_id, amount, status, created_at, responded_at
  )
  SELECT requester.id, recipient.id, 300, 'rejected', '2026-08-05 12:00:00.000000', '2026-08-05 12:30:00.000000'
  FROM users AS requester
  CROSS JOIN users AS recipient
  WHERE requester.user_id = 'auto-id-test'
    AND recipient.user_id = 'recipient-test';
"

query "$(cat "${repository_root}/database/migrations/V6__add_responded_by_to_payment_requests.sql")"

backfilled_responded_by="$(query "
  SELECT CONCAT(
    SUM(status = 'pending' AND responded_by IS NULL), ':',
    SUM(status <> 'pending' AND responded_by = recipient_id), ':',
    SUM(status <> 'pending' AND responded_by IS NULL)
  )
  FROM payment_requests;
")"
assert_equals \
  "1:2:0" \
  "${backfilled_responded_by}" \
  "V6 must backfill responded_by with the recipient for responded requests only"

echo "Database migration tests passed."
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
