#!/usr/bin/env bash

set -euo pipefail

: "${MYSQL_DATABASE:?MYSQL_DATABASE is required}"
: "${MYSQL_USER:?MYSQL_USER is required}"
: "${MYSQL_PASSWORD:?MYSQL_PASSWORD is required}"

docker compose exec -T \
  -e MYSQL_PWD="${MYSQL_PASSWORD}" \
  mysql \
  mysql --user="${MYSQL_USER}" --database="${MYSQL_DATABASE}" \
  < database/seeds/development.sql

