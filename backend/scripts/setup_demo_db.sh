#!/usr/bin/env bash
# Creates the SQL Assist demo database (PostgreSQL) with sample e-commerce data.
# Requires a running local PostgreSQL where the current user can create roles/databases.
#
# Usage:  bash backend/scripts/setup_demo_db.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_NAME="sqlassist_demo"
DB_USER="sqlassist"
DB_PASS="sqlassist123"

echo "==> Creating role '$DB_USER' and database '$DB_NAME'…"
psql -d postgres -v ON_ERROR_STOP=1 <<SQL
DROP DATABASE IF EXISTS ${DB_NAME};
DO \$\$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
      CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASS}';
   ELSE
      ALTER ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASS}';
   END IF;
END\$\$;
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};
SQL

echo "==> Seeding schema + data…"
psql -d "$DB_NAME" -v ON_ERROR_STOP=1 -f "$SCRIPT_DIR/seed_demo_db.sql" >/dev/null

echo "==> Done. Connect a project with:"
echo "      db_type   : postgres"
echo "      host      : 127.0.0.1"
echo "      port      : 5432"
echo "      database  : $DB_NAME"
echo "      username  : $DB_USER"
echo "      password  : $DB_PASS"
